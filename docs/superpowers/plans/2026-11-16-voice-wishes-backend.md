# Voice wishes — backend (KAN-219) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A wish can carry a recording of up to 60 seconds. The backend checks the upload, converts it to mono 64 kbps AAC `.m4a`, stores it privately in R2 and hands hosts and the author a short-lived link to play it.

**Architecture:** The three wish writes (`POST /api/events/{eventId}/wishbook`, `POST /api/qr/{token}/wishes`, `PUT /api/wishbook/{entryId}`) gain a `multipart/form-data` variant beside the JSON one: a `wish` JSON part plus an optional `audio` file part. The controller does the cheap checks (who is writing, QR token, acceptance), then `WishAudioProcessor` validates and converts the file with ffmpeg on the request thread, outside any transaction. `WishbookService` stores the converted file under its own prefix `wishbook-audio/{eventId}/` while the wish transaction runs; `WishAudioFiles` deletes it again if the transaction rolls back, and deletes replaced or removed recordings after commit. The orphan sweep only lists `events/`, so it never sees these files. Event purge clears the prefix; account deletion deletes the account's recordings.

**Tech Stack:** Spring Boot 3, JPA/Hibernate, Flyway, PostgreSQL, ffmpeg/ffprobe through `FfmpegRunner`, Cloudflare R2 through `StorageService`, JUnit 5 + Mockito + MockMvc.

**Repo and branch:** guestwall-be. Create a worktree `C:\Users\User\IdeaProjects\event_social_media-kan-219` on a new branch `claude/kan-219-voice-wishes`, cut from `claude/kan-217-private-wishbook` (Part 1, PR guestwall-be#163) while that PR is open, and rebased onto `origin/staging` once #163 merges. The PR goes into `staging`, titled `KAN-219: Voice wishes`. Every commit message starts with `KAN-219: ` and ends with the `Co-Authored-By` line.

**Owner decisions this plan follows** (spec `docs/superpowers/specs/2026-11-16-voice-wishes-design.md` in the storywall repo, plus 2026-11-16 answers):

- A wish is text, a recording, or both. At least one.
- 60 s on the client; the server accepts up to 62 s.
- Converted synchronously on upload; no queue, no "processing" state.
- Recordings live under their own prefix `wishbook-audio/{eventId}/{uuid}.m4a`, not under `events/`.
- A replaced or removed recording, and the recording of a deleted wish, is deleted right after the change commits. A failed delete is logged; the file goes with the event purge.
- Account deletion deletes the account's recordings. A wish with text keeps its text; a voice-only wish is removed.
- Only hosts, co-hosts and the author get the recording link. Admins get it in moderation.
- The printed book stays text-only: voice-only wishes are skipped, and audio-only changes never mark the book out of date.

---

## File map

**Create**

- `src/main/resources/db/migration/V227__wishbook_entries_audio.sql` — audio columns, nullable message, check constraint.
- `J/service/media/AudioProbeResult.java` — what ffprobe says about a recording.
- `J/service/wishbook/audio/WishAudioProcessor.java` — size, header sniff, probe, convert. Returns a temp `.m4a`.
- `J/service/wishbook/audio/ProcessedWishAudio.java` — the converted temp file and its duration; `AutoCloseable` deletes the file.
- `J/service/wishbook/audio/WishAudioFiles.java` — store with rollback cleanup, delete after commit, purge an event's folder.
- `J/exception/WishAudioRejectedException.java` — the four upload errors.
- `J/dto/wishbook/WishAudioDto.java` — `{ url, durationMs }` in responses.
- `J/controller/wishbook/WishPartReader.java` — reads and validates the `wish` JSON part.
- Tests: `WishAudioProcessorTest`, `WishAudioProcessorFfmpegIntegrationTest`, `WishAudioFilesTest`, `WishbookVoiceServiceTest`, `WishbookVoiceControllerTest`, `V227WishbookAudioMigrationTest`.

**Modify**

- `J/service/media/FfmpegRunner.java`, `J/service/media/ProcessBuilderFfmpegRunner.java` — `probeAudio`, `transcodeAudio`.
- `J/service/storage/StorageService.java`, `J/service/storage/R2StorageService.java` — `uploadWishAudio`, `deleteWishAudioObjects`.
- `J/model/wishbook/WishbookEntry.java` — `audioKey`, `audioDurationMs`, message nullable.
- `J/dto/wishbook/WishbookEntryRequestDto.java`, `WishbookEntryEditDto.java`, `AnonymousWishRequestDto.java`, `WishbookEntryResponseDto.java`.
- `J/exception/ErrorCode.java` — 3128–3132.
- `J/repository/wishbook/WishbookEntryRepository.java` — `updateAudio`, book queries skip voice-only wishes.
- `J/service/wishbook/WishbookService.java` — writes with audio, edit rules, remove deletes audio, responses carry audio.
- `J/controller/wishbook/WishbookController.java`, `J/controller/wishbook/AnonymousWishbookController.java` — multipart variants.
- `J/config/RequestBodyLimitFilter.java` — allow multipart on the three wish routes, cap them.
- `J/service/billing/MediaPurgeService.java` — purge the event's recordings.
- `J/service/user/deletion/UserAnonymizer.java` — the account's recordings.
- `J/service/wishbook/book/WishbookBookService.java`, `WishbookBookLoader.java` — voice-only wishes are not in the book.
- `J/service/moderation/ModerationContent.java`, `ModerationContentLoader.java`, `ModerationCaseService.java`, `J/dto/moderation/ModerationContentDto.java` — recording in moderation.
- Notice item picker (`NoticeBrowseService` and its repository query) — voice-only wishes are not offered as notice items.
- `docs/fe-guides/wishlist-wishbook-cohost-fe-integration.md`.

`J` = `src/main/java/event_social_media`. Test paths mirror it under `src/test/java/event_social_media`.

---

### Task 1: Migration

**Files:**
- Create: `src/main/resources/db/migration/V227__wishbook_entries_audio.sql`
- Test: `src/test/java/event_social_media/migration/V227WishbookAudioMigrationTest.java` (put it beside `V154WishbookAuthorUserMigrationTest`; use the same package and base setup that test uses)

- [ ] **Step 1: Check the number is free**

Run: `ls src/main/resources/db/migration | sort -V | tail -3`
Expected: the last file is `V226__qr_links_drop_invitation_target_type.sql`. If staging has moved on, take the next free number and rename everywhere in this plan.

- [ ] **Step 2: Write the failing test**

Model it on `V154WishbookAuthorUserMigrationTest` (same annotations, same `JdbcTemplate` and fixture style). It needs an event row to hang wishes on; reuse whatever helper that test uses.

```java
@Test
void aWishMayBeVoiceOnly() {
    UUID eventId = newEventId();
    jdbcTemplate.update("""
            insert into wishbook_entries (event_id, guest_name, message, audio_key, audio_duration_ms)
            values (?, 'Maria', null, 'wishbook-audio/e/a.m4a', 42000)""", eventId);
    assertEquals(1, jdbcTemplate.queryForObject(
            "select count(*) from wishbook_entries where event_id = ? and message is null", Integer.class, eventId));
}

@Test
void aLiveWishNeedsTextOrARecording() {
    UUID eventId = newEventId();
    assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update("""
            insert into wishbook_entries (event_id, guest_name, message) values (?, 'Maria', null)""", eventId));
    assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update("""
            insert into wishbook_entries (event_id, guest_name, message) values (?, 'Maria', '   ')""", eventId));
}

@Test
void aDeletedVoiceWishMayLoseItsRecording() {
    UUID eventId = newEventId();
    jdbcTemplate.update("""
            insert into wishbook_entries (event_id, guest_name, message, audio_key, deleted_at)
            values (?, 'Maria', null, null, now())""", eventId);
}

@Test
void aRecordingKeyComesWithItsDuration() {
    UUID eventId = newEventId();
    assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update("""
            insert into wishbook_entries (event_id, guest_name, message, audio_key)
            values (?, 'Maria', 'Hi', 'wishbook-audio/e/a.m4a')""", eventId));
}
```

- [ ] **Step 3: Run it to see it fail**

Run: `./gradlew test --tests '*V227WishbookAudioMigrationTest'`
Expected: FAIL (column `audio_key` does not exist).

- [ ] **Step 4: Write the migration**

```sql
-- KAN-219: a wish may carry a recording. The text becomes optional; a live wish needs one of the two.
-- A soft-deleted wish may have neither: its recording is deleted with it.
alter table wishbook_entries
    add column audio_key varchar(200),
    add column audio_duration_ms integer;

alter table wishbook_entries alter column message drop not null;

alter table wishbook_entries
    add constraint wishbook_entries_text_or_audio
        check (deleted_at is not null or (message is not null and btrim(message) <> '') or audio_key is not null),
    add constraint wishbook_entries_audio_has_duration
        check ((audio_key is null) = (audio_duration_ms is null)),
    add constraint wishbook_entries_audio_duration_range
        check (audio_duration_ms is null or (audio_duration_ms > 0 and audio_duration_ms <= 62000));
```

- [ ] **Step 5: Run the test to see it pass**

Run: `./gradlew test --tests '*V227WishbookAudioMigrationTest' --tests '*Wishbook*Migration*'`
Expected: PASS, including the older wishbook migration tests.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V227__wishbook_entries_audio.sql src/test/java/event_social_media/migration/V227WishbookAudioMigrationTest.java
git commit -m "KAN-219: Wishes may carry a recording (migration)"
```

---

### Task 2: Entity and DTOs

**Files:**
- Modify: `J/model/wishbook/WishbookEntry.java:77-80`
- Modify: `J/dto/wishbook/WishbookEntryRequestDto.java`, `WishbookEntryEditDto.java`, `AnonymousWishRequestDto.java`, `WishbookEntryResponseDto.java`
- Create: `J/dto/wishbook/WishAudioDto.java`

No new test in this task: Task 7's service tests cover it. This task only has to compile.

- [ ] **Step 1: Entity**

Replace the `message` field and add the two audio fields:

```java
/** Optional since KAN-219: a voice-only wish has none. A live wish has text or a recording (V227). */
@Size(max = TextLimits.WISHBOOK_MESSAGE_MAX)
@Column(name = "message", length = 2000)
private String message;

/** The converted recording under {@code wishbook-audio/{eventId}/}, or null. Never under {@code events/}. */
@Column(name = "audio_key", length = 200)
private String audioKey;

@Column(name = "audio_duration_ms")
private Integer audioDurationMs;
```

(Keep the existing Lombok `@Getter @Setter` on the class; if the class uses a different import for `TextLimits`, keep its existing `@Size(max = 2000)` instead.)

- [ ] **Step 2: Request DTOs**

In `WishbookEntryRequestDto` and `AnonymousWishRequestDto`, drop `@NotBlank` from `message` and keep `@Size(max = TextLimits.WISHBOOK_MESSAGE_MAX)`. Add to the class comment: "The message is optional when the request also carries a recording; `WishbookService` enforces text or audio (3132)."

`WishbookEntryEditDto` becomes:

```java
/**
 * The author changing their wish. The text, and whether to drop the recording. A new recording
 * comes as the {@code audio} part of a multipart request. The result must still have text or a
 * recording (3132).
 */
@Getter
@Setter
public class WishbookEntryEditDto {

    @Size(max = TextLimits.WISHBOOK_MESSAGE_MAX)
    private String message;

    /** True drops the stored recording. Ignored when the request carries a new one. */
    private boolean removeAudio;
}
```

- [ ] **Step 3: Response DTO**

```java
package event_social_media.dto.wishbook;

/** A wish's recording as hosts and its author receive it. {@code url} is presigned and short-lived. */
public record WishAudioDto(String url, int durationMs) {
}
```

Add to `WishbookEntryResponseDto`:

```java
/** Hosts, co-hosts and the author only; null for everyone else and for a wish without one. */
private WishAudioDto audio;
```

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava compileTestJava`
Expected: BUILD SUCCESSFUL. (Existing tests that call `setMessage` still compile.)

- [ ] **Step 5: Commit**

```bash
git add -A src/main/java/event_social_media/model/wishbook src/main/java/event_social_media/dto/wishbook
git commit -m "KAN-219: Wish entity and DTOs carry a recording"
```

---

### Task 3: Error codes and the rejection exception

**Files:**
- Modify: `J/exception/ErrorCode.java` (after `EMAIL_CODE_INVALID(3127)`, line ~701)
- Create: `J/exception/WishAudioRejectedException.java`
- Test: `src/test/java/event_social_media/exception/WishbookErrorCodesTest.java` (extend)

- [ ] **Step 1: Check the codes are free**

Run: `grep -n "(312[89])\|(313[0-2])" src/main/java/event_social_media/exception/ErrorCode.java`
Expected: no output. If any is taken on staging, use the next free 31xx codes and update the frontend plan's table to match.

- [ ] **Step 2: Write the failing test**

Add to `WishbookErrorCodesTest` (follow how it already asserts codes):

```java
@Test
void voiceWishCodes() {
    assertEquals(3128, ErrorCode.WISH_AUDIO_TOO_LARGE.getCode());
    assertEquals(3129, ErrorCode.WISH_AUDIO_NOT_AUDIO.getCode());
    assertEquals(3130, ErrorCode.WISH_AUDIO_TOO_LONG.getCode());
    assertEquals(3131, ErrorCode.WISH_AUDIO_CONVERSION_FAILED.getCode());
    assertEquals(3132, ErrorCode.WISH_EMPTY.getCode());

    assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, WishAudioRejectedException.tooLarge(6_000_000).getStatus());
    assertEquals(HttpStatus.BAD_REQUEST, WishAudioRejectedException.notAudio().getStatus());
    assertEquals(HttpStatus.BAD_REQUEST, WishAudioRejectedException.tooLong(70_000).getStatus());
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, WishAudioRejectedException.conversionFailed().getStatus());
    assertEquals(70_000L, WishAudioRejectedException.tooLong(70_000).getDetails().get("durationMs"));
}
```

(Use whatever accessor the existing test uses for the numeric code, e.g. `getCode()`; `ApiException` exposes `getStatus()` — check its getter name and match it.)

- [ ] **Step 3: Run it to see it fail**

Run: `./gradlew test --tests '*WishbookErrorCodesTest'`
Expected: FAIL to compile.

- [ ] **Step 4: Add the codes**

```java
/** 3128 — The recording is over 5 MB. {@code 413}. {@code details.limitBytes}. */
WISH_AUDIO_TOO_LARGE(3128),

/** 3129 — The {@code audio} part is not a WebM, Ogg or MP4 file with a sound track. {@code 400}. */
WISH_AUDIO_NOT_AUDIO(3129),

/** 3130 — The recording is longer than 62 s (the app stops at 60). {@code 400}. {@code details.limitMs}. */
WISH_AUDIO_TOO_LONG(3130),

/** 3131 — The recording could not be converted or stored, or the server was too busy to. Try again. {@code 422}. */
WISH_AUDIO_CONVERSION_FAILED(3131),

/** 3132 — A wish needs text or a recording; this one would have neither. {@code 400}. */
WISH_EMPTY(3132),
```

- [ ] **Step 5: Add the exception**

Model it on `MediaRejectedException` (same base class, `HasErrorDetails`, private constructor):

```java
package event_social_media.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Why a wish's recording was refused. One code per cause so the app can say which (KAN-219). */
@Getter
public class WishAudioRejectedException extends ApiException implements HasErrorDetails {

    public static final long MAX_BYTES = 5L * 1024 * 1024;
    public static final long MAX_DURATION_MS = 62_000;

    private final Map<String, Object> details;

    private WishAudioRejectedException(HttpStatus status, ErrorCode code, String message, Map<String, Object> details) {
        super(message, status, code);
        this.details = details;
    }

    public static WishAudioRejectedException tooLarge(long actualBytes) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("limitBytes", MAX_BYTES);
        details.put("actualBytes", actualBytes);
        return new WishAudioRejectedException(HttpStatus.PAYLOAD_TOO_LARGE, ErrorCode.WISH_AUDIO_TOO_LARGE,
                "This recording is too large.", details);
    }

    public static WishAudioRejectedException notAudio() {
        return new WishAudioRejectedException(HttpStatus.BAD_REQUEST, ErrorCode.WISH_AUDIO_NOT_AUDIO,
                "This recording can't be used.", Map.of());
    }

    public static WishAudioRejectedException tooLong(long durationMs) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("limitMs", MAX_DURATION_MS);
        details.put("durationMs", durationMs);
        return new WishAudioRejectedException(HttpStatus.BAD_REQUEST, ErrorCode.WISH_AUDIO_TOO_LONG,
                "Recordings can be up to 1 minute.", details);
    }

    public static WishAudioRejectedException conversionFailed() {
        return new WishAudioRejectedException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.WISH_AUDIO_CONVERSION_FAILED,
                "This recording couldn't be saved.", Map.of());
    }
}
```

`WISH_EMPTY` is thrown as `new BadRequestException(ErrorCode.WISH_EMPTY, "Write a message or record one.")` (Task 7).

- [ ] **Step 6: Run the test to see it pass**

Run: `./gradlew test --tests '*WishbookErrorCodesTest' --tests '*ErrorCode*'`
Expected: PASS (any test that checks codes are unique passes too).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/exception src/test/java/event_social_media/exception
git commit -m "KAN-219: Error codes for voice wishes"
```

---

### Task 4: ffprobe and ffmpeg for audio

**Files:**
- Create: `J/service/media/AudioProbeResult.java`
- Modify: `J/service/media/FfmpegRunner.java`, `J/service/media/ProcessBuilderFfmpegRunner.java`
- Test: `src/test/java/event_social_media/service/media/ProcessBuilderFfmpegRunnerTest.java` (extend; it already tests command builders and parsing)

- [ ] **Step 1: Write the failing tests**

```java
@Test
void probesTheFirstAudioStream() {
    assertEquals(List.of("ffprobe", "-v", "error", "-select_streams", "a:0",
                    "-show_entries", "stream=codec_type:format=duration", "-of", "json", "/tmp/in.webm"),
            runner.probeAudioCommand(new File("/tmp/in.webm")));
}

@Test
void readsTheAudioDurationInMilliseconds() {
    AudioProbeResult result = ProcessBuilderFfmpegRunner.parseAudioProbeOutput(
            "{\"streams\":[{\"codec_type\":\"audio\"}],\"format\":{\"duration\":\"41.873000\"}}");
    assertTrue(result.hasAudio());
    assertEquals(41_873, result.durationMs());
}

@Test
void aFileWithoutAnAudioStreamHasNoAudio() {
    AudioProbeResult result = ProcessBuilderFfmpegRunner.parseAudioProbeOutput(
            "{\"streams\":[],\"format\":{\"duration\":\"3.0\"}}");
    assertFalse(result.hasAudio());
}

@Test
void aMissingDurationIsZero() {
    // MediaRecorder WebM often has no duration in its header; ffprobe then reports none.
    AudioProbeResult result = ProcessBuilderFfmpegRunner.parseAudioProbeOutput(
            "{\"streams\":[{\"codec_type\":\"audio\"}],\"format\":{}}");
    assertEquals(0, result.durationMs());
}

@Test
void convertsToMonoAacWithoutMetadata() {
    assertEquals(List.of("ffmpeg", "-nostdin", "-y", "-i", "/tmp/in.webm",
                    "-map", "0:a:0", "-vn", "-sn", "-dn", "-map_metadata", "-1", "-map_chapters", "-1",
                    "-ac", "1", "-c:a", "aac", "-b:a", "64k", "-t", "62",
                    "-movflags", "+faststart", "-f", "mp4", "/tmp/out.m4a"),
            runner.transcodeAudioCommand(new File("/tmp/in.webm"), new File("/tmp/out.m4a")));
}
```

Use the same `runner` construction the existing test uses (`new ProcessBuilderFfmpegRunner("ffmpeg", "ffprobe", 30, 2)`), and if it builds paths with `getAbsolutePath()`, compare against `new File(...).getAbsolutePath()` so the test passes on Windows too.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests '*ProcessBuilderFfmpegRunnerTest'`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

`AudioProbeResult.java`:

```java
package event_social_media.service.media;

/** ffprobe's answer for a recording: whether there is a sound track, and how long the file runs. */
public record AudioProbeResult(boolean hasAudio, long durationMs) {
}
```

`FfmpegRunner` gains:

```java
/** The first audio stream and the container's duration. A file with no duration reports 0. */
AudioProbeResult probeAudio(File input) throws IOException, InterruptedException;

/**
 * One pass to mono 64 kbps AAC in an MP4 (.m4a) container, metadata stripped, cut at 62 s. Only the
 * first audio stream is kept.
 */
void transcodeAudio(File input, File output) throws IOException, InterruptedException;
```

`ProcessBuilderFfmpegRunner` gains (beside `probe` and `stripMetadataCommand`; reuse its `run(...)` and its base timeout field — check its name, e.g. `timeoutSeconds`):

```java
@Override
public AudioProbeResult probeAudio(File input) throws IOException, InterruptedException {
    return parseAudioProbeOutput(run(probeAudioCommand(input), timeoutSeconds));
}

List<String> probeAudioCommand(File input) {
    return List.of(ffprobePath, "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=codec_type:format=duration", "-of", "json", input.getAbsolutePath());
}

static AudioProbeResult parseAudioProbeOutput(String json) {
    try {
        JsonNode root = PROBE_MAPPER.readTree(json);
        boolean hasAudio = false;
        for (JsonNode stream : root.path("streams")) {
            if ("audio".equals(stream.path("codec_type").asText())) {
                hasAudio = true;
            }
        }
        JsonNode duration = root.path("format").path("duration");
        long ms = duration.isMissingNode() || duration.asText().isBlank()
                ? 0 : Math.round(Double.parseDouble(duration.asText()) * 1000);
        return new AudioProbeResult(hasAudio, ms);
    } catch (JsonProcessingException | NumberFormatException e) {
        throw new IllegalStateException("Unreadable ffprobe output", e);
    }
}

@Override
public void transcodeAudio(File input, File output) throws IOException, InterruptedException {
    run(transcodeAudioCommand(input, output), timeoutSeconds);
}

List<String> transcodeAudioCommand(File input, File output) {
    return List.of(ffmpegPath, "-nostdin", "-y", "-i", input.getAbsolutePath(),
            "-map", "0:a:0", "-vn", "-sn", "-dn", "-map_metadata", "-1", "-map_chapters", "-1",
            "-ac", "1", "-c:a", "aac", "-b:a", "64k", "-t", "62",
            "-movflags", "+faststart", "-f", "mp4", output.getAbsolutePath());
}
```

`parseProbeOutput` already parses JSON; reuse its mapper (whatever it is named) instead of `PROBE_MAPPER` if one exists. `IllegalStateException` from parsing is caught by `WishAudioProcessor` (Task 5) and turned into 3131.

Mocks of `FfmpegRunner` in other tests keep compiling (Mockito). If a hand-written fake implements the interface anywhere (`grep -rn "implements FfmpegRunner" src`), add the two methods to it throwing `UnsupportedOperationException`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `./gradlew test --tests '*FfmpegRunner*'`
Expected: PASS (the integration test is skipped if ffmpeg is not on PATH).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/media src/test/java/event_social_media/service/media
git commit -m "KAN-219: ffprobe and ffmpeg commands for recordings"
```

---

### Task 5: WishAudioProcessor

Checks the upload and converts it. Runs outside any transaction.

**Files:**
- Create: `J/service/wishbook/audio/ProcessedWishAudio.java`, `J/service/wishbook/audio/WishAudioProcessor.java`
- Test: `src/test/java/event_social_media/service/wishbook/audio/WishAudioProcessorTest.java`, `WishAudioProcessorFfmpegIntegrationTest.java`

Order of checks, each cheaper than the next: size → header bytes → ffprobe (has audio, duration ≤ 62 s) → ffmpeg → the output's own duration.

Accepted headers: EBML `1A 45 DF A3` (WebM, Chrome/Firefox/Android), `OggS` (Firefox on some platforms), and any ISO-BMFF `ftyp` box at offset 4 (Safari's `audio/mp4`, whose brand varies: `M4A `, `isom`, `iso5`, `mp42`…). `MediaTypeDetector` is not reused: it maps everything to video and rejects `M4A ` and `iso5`. ffprobe is the real check that the file holds sound.

A MediaRecorder WebM often has no duration in its header (ffprobe reports 0). Then the converted file's duration is the one that counts: the transcode cuts at 62 s, so a longer source comes out at 62 s and is refused as too long.

- [ ] **Step 1: Write the failing unit test**

```java
package event_social_media.service.wishbook.audio;

class WishAudioProcessorTest {

    private final FfmpegRunner ffmpeg = mock(FfmpegRunner.class);
    private final WishAudioProcessor processor = new WishAudioProcessor(ffmpeg, 2, 1);

    private static final byte[] WEBM = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    private static final byte[] OGG = {'O', 'g', 'g', 'S', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    private static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'M', '4', 'A', ' ', 0, 0, 0, 0};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0};

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("audio", "wish.webm", "audio/webm", bytes);
    }

    /** The converted file's probe: ffmpeg wrote it, so the second probe call is about the output. */
    private void probes(AudioProbeResult source, AudioProbeResult output) throws Exception {
        when(ffmpeg.probeAudio(any())).thenReturn(source, output);
    }

    @Test
    void refusesAFileOverFiveMegabytes() {
        MockMultipartFile big = new MockMultipartFile("audio", "a.webm", "audio/webm", new byte[(int) WishAudioRejectedException.MAX_BYTES + 1]);
        WishAudioRejectedException ex = assertThrows(WishAudioRejectedException.class, () -> processor.process(big));
        assertEquals(ErrorCode.WISH_AUDIO_TOO_LARGE, ex.getErrorCode());
        verifyNoInteractions(ffmpeg);
    }

    @Test
    void refusesAnImage() {
        WishAudioRejectedException ex = assertThrows(WishAudioRejectedException.class, () -> processor.process(file(PNG)));
        assertEquals(ErrorCode.WISH_AUDIO_NOT_AUDIO, ex.getErrorCode());
        verifyNoInteractions(ffmpeg);
    }

    @Test
    void refusesAnEmptyOrTinyFile() {
        assertEquals(ErrorCode.WISH_AUDIO_NOT_AUDIO,
                assertThrows(WishAudioRejectedException.class, () -> processor.process(file(new byte[3]))).getErrorCode());
    }

    @Test
    void refusesAFileWithoutSound() throws Exception {
        probes(new AudioProbeResult(false, 3000), null);
        assertEquals(ErrorCode.WISH_AUDIO_NOT_AUDIO,
                assertThrows(WishAudioRejectedException.class, () -> processor.process(file(MP4))).getErrorCode());
        verify(ffmpeg, never()).transcodeAudio(any(), any());
    }

    @Test
    void refusesARecordingOverSixtyTwoSeconds() throws Exception {
        probes(new AudioProbeResult(true, 62_001), null);
        assertEquals(ErrorCode.WISH_AUDIO_TOO_LONG,
                assertThrows(WishAudioRejectedException.class, () -> processor.process(file(WEBM))).getErrorCode());
        verify(ffmpeg, never()).transcodeAudio(any(), any());
    }

    @Test
    void aSourceWithNoDurationIsJudgedByTheConvertedFile() throws Exception {
        // MediaRecorder WebM: no duration in the header. ffmpeg cuts at 62 s, so a long source comes out at 62 s.
        probes(new AudioProbeResult(true, 0), new AudioProbeResult(true, 62_000));
        // 62 000 ms exactly is the cut, which means the source ran longer than the cap allows.
        assertEquals(ErrorCode.WISH_AUDIO_TOO_LONG,
                assertThrows(WishAudioRejectedException.class, () -> processor.process(file(WEBM))).getErrorCode());
    }

    @Test
    void convertsAnAcceptedRecording() throws Exception {
        probes(new AudioProbeResult(true, 41_873), new AudioProbeResult(true, 41_880));
        try (ProcessedWishAudio audio = processor.process(file(OGG))) {
            assertEquals(41_880, audio.durationMs());
            verify(ffmpeg).transcodeAudio(any(), eq(audio.file().toFile()));
        }
    }

    @Test
    void closingDeletesTheConvertedFile() throws Exception {
        probes(new AudioProbeResult(true, 5000), new AudioProbeResult(true, 5000));
        ProcessedWishAudio audio = processor.process(file(WEBM));
        Files.writeString(audio.file(), "x");
        audio.close();
        assertFalse(Files.exists(audio.file()));
    }

    @Test
    void aFailedConversionIs3131() throws Exception {
        probes(new AudioProbeResult(true, 5000), null);
        doThrow(new IOException("ffmpeg exited 1")).when(ffmpeg).transcodeAudio(any(), any());
        assertEquals(ErrorCode.WISH_AUDIO_CONVERSION_FAILED,
                assertThrows(WishAudioRejectedException.class, () -> processor.process(file(WEBM))).getErrorCode());
    }

    @Test
    void anUnreadableProbeIs3129() throws Exception {
        when(ffmpeg.probeAudio(any())).thenThrow(new IOException("ffprobe exited 1"));
        assertEquals(ErrorCode.WISH_AUDIO_NOT_AUDIO,
                assertThrows(WishAudioRejectedException.class, () -> processor.process(file(WEBM))).getErrorCode());
    }

    @Test
    void whenEveryLaneIsBusyItIs3131() throws Exception {
        WishAudioProcessor oneLane = new WishAudioProcessor(ffmpeg, 1, 0);
        CountDownLatch inside = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(ffmpeg.probeAudio(any())).thenAnswer(inv -> { inside.countDown(); release.await(); return new AudioProbeResult(true, 1000); });
        Thread first = new Thread(() -> { try { oneLane.process(file(WEBM)).close(); } catch (Exception ignored) { } });
        first.start();
        inside.await();
        assertEquals(ErrorCode.WISH_AUDIO_CONVERSION_FAILED,
                assertThrows(WishAudioRejectedException.class, () -> oneLane.process(file(WEBM))).getErrorCode());
        release.countDown();
        first.join();
    }
}
```

(Use the getter `ApiException` really has for the code — `getErrorCode()` or similar. Check one existing test that asserts a `MediaRejectedException` code.)

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests '*WishAudioProcessorTest'`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

`ProcessedWishAudio.java`:

```java
package event_social_media.service.wishbook.audio;

import java.nio.file.Files;
import java.nio.file.Path;

/** A converted recording in a temp file. Close it once it is stored, or when the request fails. */
public record ProcessedWishAudio(Path file, int durationMs) implements AutoCloseable {

    @Override
    public void close() {
        try {
            Files.deleteIfExists(file);
        } catch (java.io.IOException e) {
            file.toFile().deleteOnExit();
        }
    }
}
```

`WishAudioProcessor.java`:

```java
package event_social_media.service.wishbook.audio;

/**
 * Checks a wish's recording and converts it to mono 64 kbps AAC (.m4a), on the request thread.
 * A 60 s clip converts in well under a second, so there is no queue (spec, approach A).
 *
 * <p>Lanes are shared by every request on this instance; when none frees up within the wait, the
 * recording is refused with 3131 and the app asks to try again, rather than queueing requests behind
 * ffmpeg.
 */
@Slf4j
@Component
public class WishAudioProcessor {

    private static final int HEADER_BYTES = 12;

    private final FfmpegRunner ffmpeg;
    private final Semaphore lanes;
    private final int waitSeconds;

    public WishAudioProcessor(FfmpegRunner ffmpeg,
                              @Value("${wishbook.audio.max-concurrent:4}") int maxConcurrent,
                              @Value("${wishbook.audio.wait-seconds:10}") int waitSeconds) {
        this.ffmpeg = ffmpeg;
        this.lanes = new Semaphore(maxConcurrent);
        this.waitSeconds = waitSeconds;
    }

    public ProcessedWishAudio process(MultipartFile audio) throws IOException {
        if (audio.getSize() > WishAudioRejectedException.MAX_BYTES) {
            log.info("Wish recording refused: {} bytes", audio.getSize());
            throw WishAudioRejectedException.tooLarge(audio.getSize());
        }
        if (!looksLikeAudioContainer(audio)) {
            log.info("Wish recording refused: not a WebM, Ogg or MP4 file");
            throw WishAudioRejectedException.notAudio();
        }
        acquireLane();
        Path source = Files.createTempFile("wish-audio-in-", ".bin");
        Path output = Files.createTempFile("wish-audio-out-", ".m4a");
        boolean handedOver = false;
        try {
            audio.transferTo(source);
            AudioProbeResult probe = probe(source);
            if (!probe.hasAudio()) {
                log.info("Wish recording refused: no audio stream");
                throw WishAudioRejectedException.notAudio();
            }
            rejectTooLong(probe.durationMs());
            convert(source, output);
            AudioProbeResult converted = probe(output);
            // The transcode cuts at 62 s: a cut file means the source ran over the cap.
            if (!converted.hasAudio() || converted.durationMs() <= 0) {
                throw WishAudioRejectedException.conversionFailed();
            }
            if (converted.durationMs() >= WishAudioRejectedException.MAX_DURATION_MS) {
                throw WishAudioRejectedException.tooLong(converted.durationMs());
            }
            handedOver = true;
            return new ProcessedWishAudio(output, (int) converted.durationMs());
        } finally {
            Files.deleteIfExists(source);
            if (!handedOver) {
                Files.deleteIfExists(output);
            }
            lanes.release();
        }
    }

    private static boolean looksLikeAudioContainer(MultipartFile audio) throws IOException {
        byte[] head;
        try (InputStream in = audio.getInputStream()) {
            head = in.readNBytes(HEADER_BYTES);
        }
        if (head.length < HEADER_BYTES) {
            return false;
        }
        boolean ebml = (head[0] & 0xFF) == 0x1A && (head[1] & 0xFF) == 0x45 && (head[2] & 0xFF) == 0xDF && (head[3] & 0xFF) == 0xA3;
        boolean ogg = head[0] == 'O' && head[1] == 'g' && head[2] == 'g' && head[3] == 'S';
        boolean isoBmff = head[4] == 'f' && head[5] == 't' && head[6] == 'y' && head[7] == 'p';
        return ebml || ogg || isoBmff;
    }

    private static void rejectTooLong(long durationMs) {
        if (durationMs > WishAudioRejectedException.MAX_DURATION_MS) {
            log.info("Wish recording refused: {} ms", durationMs);
            throw WishAudioRejectedException.tooLong(durationMs);
        }
    }

    private AudioProbeResult probe(Path file) throws IOException {
        try {
            return ffmpeg.probeAudio(file.toFile());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while probing a wish recording", e);
        } catch (IOException | IllegalStateException e) {
            log.info("Wish recording refused: ffprobe could not read it ({})", e.getMessage());
            throw WishAudioRejectedException.notAudio();
        }
    }

    private void convert(Path source, Path output) throws IOException {
        try {
            ffmpeg.transcodeAudio(source.toFile(), output.toFile());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while converting a wish recording", e);
        } catch (IOException e) {
            log.warn("Wish recording conversion failed: {}", e.getMessage());
            throw WishAudioRejectedException.conversionFailed();
        }
    }

    private void acquireLane() throws IOException {
        try {
            if (!lanes.tryAcquire(waitSeconds, TimeUnit.SECONDS)) {
                log.warn("Wish recording refused: every conversion lane is busy");
                throw WishAudioRejectedException.conversionFailed();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while waiting for a conversion lane", e);
        }
    }
}
```

Add to `application.properties`, beside the other `media.video.*` keys:

```properties
# KAN-219: wish recordings converted on the request thread; lanes shared by the instance.
wishbook.audio.max-concurrent=${WISHBOOK_AUDIO_MAX_CONCURRENT:4}
wishbook.audio.wait-seconds=${WISHBOOK_AUDIO_WAIT_SECONDS:10}
```

- [ ] **Step 4: Run the unit test to see it pass**

Run: `./gradlew test --tests '*WishAudioProcessorTest'`
Expected: PASS.

- [ ] **Step 5: Write the real-ffmpeg test**

No binary fixtures: the test makes its own clips with ffmpeg's tone generator. Skipped when ffmpeg is not installed, like `ProcessBuilderFfmpegRunnerIntegrationTest` (copy its `isFfmpegAvailable()` helper).

```java
class WishAudioProcessorFfmpegIntegrationTest {

    private final ProcessBuilderFfmpegRunner runner = new ProcessBuilderFfmpegRunner("ffmpeg", "ffprobe", 30, 2);
    private final WishAudioProcessor processor = new WishAudioProcessor(runner, 2, 5);

    @BeforeAll
    static void needsFfmpeg() {
        Assumptions.assumeTrue(isFfmpegAvailable(), "ffmpeg not on PATH");
    }

    /** A sine tone in the given container, made with ffmpeg itself. */
    private static byte[] tone(int seconds, String codec, String format, @TempDir Path dir) throws Exception {
        Path out = dir.resolve("tone." + format);
        Process p = new ProcessBuilder("ffmpeg", "-nostdin", "-y", "-f", "lavfi", "-i",
                "sine=frequency=440:duration=" + seconds, "-c:a", codec, "-f", format, out.toString())
                .redirectErrorStream(true).start();
        p.getInputStream().readAllBytes();
        assertEquals(0, p.waitFor());
        return Files.readAllBytes(out);
    }

    @Test
    void convertsAWebmOpusRecording(@TempDir Path dir) throws Exception {
        byte[] webm = tone(3, "libopus", "webm", dir);
        try (ProcessedWishAudio audio = processor.process(new MockMultipartFile("audio", "a.webm", "audio/webm", webm))) {
            assertTrue(Math.abs(audio.durationMs() - 3000) < 200, "duration " + audio.durationMs());
            byte[] head = Arrays.copyOf(Files.readAllBytes(audio.file()), 8);
            assertEquals("ftyp", new String(head, 4, 4, StandardCharsets.US_ASCII));
        }
    }

    @Test
    void convertsAnMp4AacRecording(@TempDir Path dir) throws Exception {
        byte[] mp4 = tone(2, "aac", "mp4", dir);
        try (ProcessedWishAudio audio = processor.process(new MockMultipartFile("audio", "a.mp4", "audio/mp4", mp4))) {
            assertTrue(audio.durationMs() > 1500);
        }
    }

    @Test
    void refusesARecordingOverTheCap(@TempDir Path dir) throws Exception {
        byte[] webm = tone(65, "libopus", "webm", dir);
        WishAudioRejectedException ex = assertThrows(WishAudioRejectedException.class,
                () -> processor.process(new MockMultipartFile("audio", "a.webm", "audio/webm", webm)));
        assertEquals(ErrorCode.WISH_AUDIO_TOO_LONG, ex.getErrorCode());
    }

    @Test
    void refusesAVideoWithoutSound(@TempDir Path dir) throws Exception {
        Path out = dir.resolve("silent.mp4");
        Process p = new ProcessBuilder("ffmpeg", "-nostdin", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=1",
                "-an", out.toString()).redirectErrorStream(true).start();
        p.getInputStream().readAllBytes();
        assertEquals(0, p.waitFor());
        WishAudioRejectedException ex = assertThrows(WishAudioRejectedException.class,
                () -> processor.process(new MockMultipartFile("audio", "a.mp4", "video/mp4", Files.readAllBytes(out))));
        assertEquals(ErrorCode.WISH_AUDIO_NOT_AUDIO, ex.getErrorCode());
    }
}
```

If the local ffmpeg has no `libopus` encoder, use `libvorbis` with `webm`; if neither, skip that test with `Assumptions`. Note the result of this test in the PR: CI may skip it (no ffmpeg in the test image), so run it locally.

- [ ] **Step 6: Run it**

Run: `./gradlew test --tests '*WishAudioProcessorFfmpegIntegrationTest'`
Expected: PASS locally with ffmpeg installed (`ffmpeg -version` to check), SKIPPED without.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/service/wishbook/audio src/test/java/event_social_media/service/wishbook/audio src/main/resources/application.properties
git commit -m "KAN-219: Check and convert a wish recording"
```

---

### Task 6: Storage — own prefix, rollback and after-commit deletes

**Files:**
- Modify: `J/service/storage/StorageService.java` (beside `uploadWishbookBook`, L101), `J/service/storage/R2StorageService.java` (beside `uploadWishbookBook` L316 and `deleteWishbookBookObjects` L341)
- Create: `J/service/wishbook/audio/WishAudioFiles.java`
- Test: `src/test/java/event_social_media/service/storage/R2StorageServiceTest.java` (extend), `src/test/java/event_social_media/service/wishbook/audio/WishAudioFilesTest.java`

- [ ] **Step 1: Write the failing storage test**

Follow how `R2StorageServiceTest` already captures `PutObjectRequest`s for `uploadWishbookBook`:

```java
@Test
void aWishRecordingGoesUnderItsOwnPrefix() throws Exception {
    Path file = Files.writeString(Files.createTempFile("a", ".m4a"), "x");
    String key = service.uploadWishAudio(EVENT_ID, file);

    assertTrue(key.matches("wishbook-audio/" + EVENT_ID + "/[0-9a-f-]{36}\\.m4a"), key);
    PutObjectRequest put = capturedPut();
    assertEquals("audio/mp4", put.contentType());
}

@Test
void deletingAnEventsRecordingsListsOnlyItsFolder() throws Exception {
    service.deleteWishAudioObjects(EVENT_ID);
    assertEquals("wishbook-audio/" + EVENT_ID + "/", capturedListRequest().prefix());
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests '*R2StorageServiceTest'`
Expected: FAIL to compile.

- [ ] **Step 3: Implement storage**

`StorageService`:

```java
/**
 * Stores a converted wish recording under {@code wishbook-audio/{eventId}/}, outside {@code events/}
 * so the orphan sweep (which lists only {@code events/}) never treats it as unreferenced.
 *
 * @return the storage key
 */
String uploadWishAudio(UUID eventId, java.nio.file.Path m4a) throws IOException;

/** Deletes every recording of the event. Used by the event purge. */
void deleteWishAudioObjects(UUID eventId) throws IOException;
```

`R2StorageService`:

```java
private static final String WISH_AUDIO_PREFIX = "wishbook-audio/";

/** {@inheritDoc} */
@Override
public String uploadWishAudio(UUID eventId, Path m4a) throws IOException {
    String storageKey = WISH_AUDIO_PREFIX + eventId + "/" + UUID.randomUUID() + ".m4a";
    return putObject(storageKey, RequestBody.fromFile(m4a), Files.size(m4a), "audio/mp4");
}

/** {@inheritDoc} */
@Override
public void deleteWishAudioObjects(UUID eventId) throws IOException {
    deleteObjectsUnder(WISH_AUDIO_PREFIX + eventId + "/");
}
```

Use the `putObject(key, body, length, contentType)` overload `uploadPath` uses (L300). It sets `Content-Disposition: attachment`; an `<audio>` element plays such a URL normally.

Check `generatePresignedUrl` and `storageKeyOfPresignedUrl` accept keys outside `events/` (they do for `wishbook-books/`; if either checks the prefix, add `WISH_AUDIO_PREFIX` there and cover it in the same test class).

- [ ] **Step 4: Run it to see it pass**

Run: `./gradlew test --tests '*R2StorageServiceTest'`
Expected: PASS.

- [ ] **Step 5: Write the failing WishAudioFiles test**

```java
@SpringBootTest
class WishAudioFilesTest {

    @MockBean
    private StorageService storageService;
    @Autowired
    private WishAudioFiles files;
    @Autowired
    private PlatformTransactionManager transactionManager;

    private final UUID eventId = UUID.randomUUID();

    private ProcessedWishAudio audio() throws IOException {
        return new ProcessedWishAudio(Files.writeString(Files.createTempFile("w", ".m4a"), "x"), 4000);
    }

    @Test
    void aRolledBackWishDeletesItsUpload() throws Exception {
        when(storageService.uploadWishAudio(eq(eventId), any())).thenReturn("wishbook-audio/k.m4a");
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            files.store(eventId, audioUnchecked());
            status.setRollbackOnly();
        });
        verify(storageService).deleteFile("wishbook-audio/k.m4a");
    }

    @Test
    void aCommittedWishKeepsItsUpload() throws Exception {
        when(storageService.uploadWishAudio(eq(eventId), any())).thenReturn("wishbook-audio/k.m4a");
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> files.store(eventId, audioUnchecked()));
        verify(storageService, never()).deleteFile(any());
    }

    @Test
    void anOldRecordingIsDeletedOnlyAfterCommit() throws Exception {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            files.deleteAfterCommit("wishbook-audio/old.m4a");
            verifyNoInteractions(storageService);
        });
        verify(storageService).deleteFile("wishbook-audio/old.m4a");
    }

    @Test
    void anOldRecordingStaysWhenTheChangeRollsBack() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            files.deleteAfterCommit("wishbook-audio/old.m4a");
            status.setRollbackOnly();
        });
        verifyNoInteractions(storageService);
    }

    @Test
    void aFailedAfterCommitDeleteIsOnlyLogged() throws Exception {
        doThrow(new IOException("R2 down")).when(storageService).deleteFile(any());
        assertDoesNotThrow(() -> new TransactionTemplate(transactionManager)
                .executeWithoutResult(status -> files.deleteAfterCommit("wishbook-audio/old.m4a")));
    }

    @Test
    void anUploadFailureIs3131() throws Exception {
        when(storageService.uploadWishAudio(any(), any())).thenThrow(new IOException("R2 down"));
        WishAudioRejectedException ex = assertThrows(WishAudioRejectedException.class, () ->
                new TransactionTemplate(transactionManager).executeWithoutResult(status -> files.store(eventId, audioUnchecked())));
        assertEquals(ErrorCode.WISH_AUDIO_CONVERSION_FAILED, ex.getErrorCode());
    }

    @Test
    void purgingAnEventDeletesItsFolder() throws Exception {
        assertTrue(files.deleteForEvent(eventId));
        verify(storageService).deleteWishAudioObjects(eventId);
    }

    @Test
    void aFailedPurgeDefersTheEvent() throws Exception {
        doThrow(new IOException("R2 down")).when(storageService).deleteWishAudioObjects(eventId);
        assertFalse(files.deleteForEvent(eventId));
    }

    private ProcessedWishAudio audioUnchecked() {
        try { return audio(); } catch (IOException e) { throw new UncheckedIOException(e); }
    }
}
```

- [ ] **Step 6: Run it to see it fail**

Run: `./gradlew test --tests '*WishAudioFilesTest'`
Expected: FAIL to compile.

- [ ] **Step 7: Implement WishAudioFiles**

```java
package event_social_media.service.wishbook.audio;

/**
 * The wish recordings in R2. A recording is uploaded inside the wish's transaction and deleted again
 * if that transaction rolls back (as {@code MediaFileUploadTransaction} does for media). A recording
 * that is replaced, removed or belongs to a deleted wish is deleted once the change commits; a failed
 * delete is logged and the file goes with the event purge (owner decision 2026-11-16).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WishAudioFiles {

    private final StorageService storageService;

    /** Must run inside a transaction. Returns the key to save on the wish. */
    public String store(UUID eventId, ProcessedWishAudio audio) {
        String key;
        try {
            key = storageService.uploadWishAudio(eventId, audio.file());
        } catch (IOException | RuntimeException e) {
            log.warn("Could not store a wish recording for event {}", eventId, e);
            throw WishAudioRejectedException.conversionFailed();
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    deleteQuietly(key);
                }
            }
        });
        return key;
    }

    /** Must run inside a transaction. Nothing happens if it rolls back. */
    public void deleteAfterCommit(String key) {
        if (key == null) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(key);
            }
        });
    }

    /** Deletes every key now. For callers that already committed (account purge). */
    public void deleteNow(Collection<String> keys) {
        keys.forEach(this::deleteQuietly);
    }

    /** @return false if the folder couldn't be cleared; the event purge then waits for the next run */
    public boolean deleteForEvent(UUID eventId) {
        try {
            storageService.deleteWishAudioObjects(eventId);
            return true;
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete the wish recordings of event {}; deferring its purge", eventId, e);
            return false;
        }
    }

    private void deleteQuietly(String key) {
        try {
            storageService.deleteFile(key);
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete wish recording {}; it goes with the event purge", key, e);
        }
    }
}
```

- [ ] **Step 8: Run the tests to see them pass**

Run: `./gradlew test --tests '*WishAudioFilesTest' --tests '*R2StorageServiceTest'`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/event_social_media/service/storage src/main/java/event_social_media/service/wishbook/audio src/test/java/event_social_media/service/storage src/test/java/event_social_media/service/wishbook/audio
git commit -m "KAN-219: Store wish recordings under their own prefix"
```

---

### Task 7: WishbookService — writes, edit, remove, responses

**Files:**
- Modify: `J/service/wishbook/WishbookService.java`
- Modify: `J/repository/wishbook/WishbookEntryRepository.java` (beside `updateMessage`, L56)
- Test: `src/test/java/event_social_media/service/wishbook/WishbookVoiceServiceTest.java` (new); keep `WishbookServiceTest` passing

Design:

- `create(eventId, dto, callerUserId, ProcessedWishAudio audio)` — `audio` may be null. The old 3-argument `create` stays and calls the new one with null, so existing callers and tests keep working. Same for `createAnonymous` and `edit`.
- New read-only checks the controller calls **before** converting a recording, so a stranger can't make the server run ffmpeg: `requireWriter(eventId, callerUserId)` (member + `requireAvailable`, exactly what `create` checks first) and `requireEditor(entryId, callerUserId)` (exists, author, `requireAvailable`). `create` and `edit` still run their own checks.
- Text is trimmed; blank becomes null. A wish with neither → `WISH_EMPTY` (3132).
- `edit`: new text (blank → null); recording: a new file replaces, `removeAudio` drops, otherwise kept. The result must have one of the two. The book is invalidated only when the text changed. The recording is written with a targeted `updateAudio` so a concurrent star survives (same reason as `updateMessage`); the old key goes to `deleteAfterCommit`.
- `remove` (author, host, moderator): `deleteAfterCommit(audioKey)` and clear `audioKey`/`audioDurationMs` on the row (the V227 constraint allows a deleted wish with neither).
- `toResponseDto`: `audio` = `new WishAudioDto(storageService.generatePresignedUrl(key), durationMs)` when the wish has one and the caller is a host or its author; otherwise null.

- [ ] **Step 1: Repository**

```java
/** Writes only the recording, so a star set at the same moment survives (as {@link #updateMessage}). */
@Modifying
@Query("update WishbookEntry w set w.audioKey = :key, w.audioDurationMs = :durationMs"
        + " where w.id = :id and w.deletedAt is null")
int updateAudio(@Param("id") UUID id, @Param("key") String key, @Param("durationMs") Integer durationMs);
```

Check how `updateMessage` is annotated (e.g. `@Modifying(flushAutomatically = true)`) and match it. `updateMessage(id, null)` must also be allowed now: it already takes a `String`, nothing to change.

- [ ] **Step 2: Write the failing tests**

`WishbookVoiceServiceTest` uses the same setup as `WishbookServiceTest` (copy its fields, `setUp`, `guestCode()`, `readyBook()`, `assertBookInvalidated()`, `reloadFromDatabase()`), plus:

```java
@MockBean
private StorageService storageService;

private ProcessedWishAudio recording(int ms) throws IOException {
    return new ProcessedWishAudio(Files.writeString(Files.createTempFile("w", ".m4a"), "x"), ms);
}

@BeforeEach
void storage() throws IOException {
    when(storageService.uploadWishAudio(any(), any()))
            .thenAnswer(inv -> "wishbook-audio/" + inv.getArgument(0) + "/" + UUID.randomUUID() + ".m4a");
    when(storageService.generatePresignedUrl(any())).thenAnswer(inv -> "https://r2.test/" + inv.getArgument(0));
}
```

Tests (each its own `@Test`):

```java
@Test
void aGuestCanLeaveAVoiceOnlyWish() throws Exception {
    WishbookEntryResponseDto saved = wishbookService.create(event.getId(), wish(null), guest.getId(), recording(4200));
    assertNull(saved.getMessage());
    assertEquals(4200, saved.getAudio().durationMs());
    assertTrue(saved.getAudio().url().startsWith("https://r2.test/wishbook-audio/" + event.getId() + "/"));
}

@Test
void aWishMayHaveTextAndARecording() throws Exception {
    WishbookEntryResponseDto saved = wishbookService.create(event.getId(), wish("  Hello  "), guest.getId(), recording(1000));
    assertEquals("Hello", saved.getMessage());
    assertNotNull(saved.getAudio());
}

@Test
void aWishWithNeitherIsRefused() {
    BadRequestException ex = assertThrows(BadRequestException.class,
            () -> wishbookService.create(event.getId(), wish("   "), guest.getId(), null));
    assertEquals(ErrorCode.WISH_EMPTY, ex.getErrorCode());
}

@Test
void aQrGuestCanLeaveAVoiceOnlyWish() throws Exception {
    AnonymousWishRequestDto dto = new AnonymousWishRequestDto();
    dto.setGuestName("Maria");
    UUID id = wishbookService.createAnonymous(guestCode(), dto, new AnonymousUploader("Maria", "1.0", "1.0"), recording(3000)).id();
    reloadFromDatabase();
    WishbookEntry entry = wishbookEntryRepository.findById(id).orElseThrow();
    assertNull(entry.getMessage());
    assertEquals(3000, entry.getAudioDurationMs());
}

@Test
void aQrWishWithNeitherIsRefused() {
    AnonymousWishRequestDto dto = new AnonymousWishRequestDto();
    dto.setGuestName("Maria");
    dto.setMessage(" ");
    assertThrows(BadRequestException.class, () -> wishbookService.createAnonymous(guestCode(), dto,
            new AnonymousUploader("Maria", "1.0", "1.0"), null));
}

@Test
void hostsGetTheRecording() throws Exception {
    wishbookService.create(event.getId(), wish(null), guest.getId(), recording(4200));
    assertNotNull(read(host.getId()).getContent().get(0).getAudio());
}

@Test
void theAuthorGetsTheirRecordingInMine() throws Exception {
    wishbookService.create(event.getId(), wish(null), guest.getId(), recording(4200));
    assertNotNull(readMine(guest.getId()).getContent().get(0).getAudio());
}

@Test
void aTextWishHasNoAudio() {
    wishbookService.create(event.getId(), wish("Hi"), guest.getId());
    assertNull(read(host.getId()).getContent().get(0).getAudio());
}

@Test
void anEditCanAddARecordingWithoutTouchingTheBook() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId()).getId();
    readyBook();
    WishbookEntryResponseDto edited = wishbookService.edit(id, edit("Hi", false), guest.getId(), recording(2000));
    assertEquals(2000, edited.getAudio().durationMs());
    reloadFromDatabase();
    assertEquals(WishbookBookStatus.READY, bookRepository.findByEventId(event.getId()).orElseThrow().getStatus());
}

@Test
void anEditCanRemoveTheRecordingWhenTextStays() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId(), recording(2000)).getId();
    WishbookEntryResponseDto edited = wishbookService.edit(id, edit("Hi", true), guest.getId(), null);
    assertNull(edited.getAudio());
    assertEquals("Hi", edited.getMessage());
}

@Test
void anEditCanDropTheTextOfAVoiceWish() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId(), recording(2000)).getId();
    readyBook();
    WishbookEntryResponseDto edited = wishbookService.edit(id, edit("", false), guest.getId(), null);
    assertNull(edited.getMessage());
    assertBookInvalidated(); // the text changed
}

@Test
void anEditCannotLeaveTheWishEmpty() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish(null), guest.getId(), recording(2000)).getId();
    BadRequestException ex = assertThrows(BadRequestException.class,
            () -> wishbookService.edit(id, edit("", true), guest.getId(), null));
    assertEquals(ErrorCode.WISH_EMPTY, ex.getErrorCode());
}

@Test
void anEditKeepsTheStarWhenTheRecordingChanges() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId()).getId();
    wishbookService.setHighlighted(id, host.getId(), true);
    wishbookService.edit(id, edit("Hi", false), guest.getId(), recording(2000));
    reloadFromDatabase();
    assertNotNull(wishbookEntryRepository.findById(id).orElseThrow().getHighlightedAt());
}

@Test
void deletingAVoiceWishClearsItsRecording() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish(null), guest.getId(), recording(2000)).getId();
    wishbookService.delete(id, guest.getId());
    reloadFromDatabase();
    WishbookEntry entry = wishbookEntryRepository.findById(id).orElseThrow();
    assertNotNull(entry.getDeletedAt());
    assertNull(entry.getAudioKey());
}

@Test
void requireWriterRefusesAStranger() {
    assertThrows(ForbiddenException.class, () -> wishbookService.requireWriter(event.getId(), fixtures.newUser().getId()));
}

@Test
void requireEditorRefusesSomeoneElse() {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId()).getId();
    assertThrows(ForbiddenException.class, () -> wishbookService.requireEditor(id, host.getId()));
}

private WishbookEntryRequestDto wish(String message) { /* as in WishbookServiceTest */ }
private WishbookEntryEditDto edit(String message, boolean removeAudio) {
    WishbookEntryEditDto dto = new WishbookEntryEditDto();
    dto.setMessage(message);
    dto.setRemoveAudio(removeAudio);
    return dto;
}
```

The class is `@Transactional` like `WishbookServiceTest`, so after-commit deletes never fire inside it. Put the two commit-dependent cases in a separate nested class or second test class **without** `@Transactional`, using `TransactionTemplate` and cleaning up its rows in `@AfterEach` (look for an existing non-transactional wishbook test, e.g. the book build tests, for the cleanup pattern):

```java
@Test
void replacingARecordingDeletesTheOldOneAfterCommit() throws Exception {
    UUID id = tx.execute(s -> wishbookService.create(event.getId(), wish(null), guest.getId(), recordingUnchecked(2000)).getId());
    String oldKey = wishbookEntryRepository.findById(id).orElseThrow().getAudioKey();
    tx.executeWithoutResult(s -> wishbookService.edit(id, edit(null, false), guest.getId(), recordingUnchecked(3000)));
    verify(storageService).deleteFile(oldKey);
}

@Test
void deletingAVoiceWishDeletesItsFileAfterCommit() throws Exception {
    UUID id = tx.execute(s -> wishbookService.create(event.getId(), wish(null), guest.getId(), recordingUnchecked(2000)).getId());
    String key = wishbookEntryRepository.findById(id).orElseThrow().getAudioKey();
    tx.executeWithoutResult(s -> wishbookService.delete(id, guest.getId()));
    verify(storageService).deleteFile(key);
}
```

- [ ] **Step 3: Run them to see them fail**

Run: `./gradlew test --tests '*WishbookVoiceServiceTest'`
Expected: FAIL to compile.

- [ ] **Step 4: Implement**

Inject `WishAudioFiles wishAudioFiles` and `StorageService storageService` (Lombok `@RequiredArgsConstructor` picks them up).

Helpers:

```java
/** Trimmed, or null when blank. */
private static String text(String message) {
    if (message == null) {
        return null;
    }
    String trimmed = message.trim();
    return trimmed.isEmpty() ? null : trimmed;
}

private static void requireTextOrAudio(String message, boolean hasAudio) {
    if (message == null && !hasAudio) {
        throw new BadRequestException(ErrorCode.WISH_EMPTY, "Write a message or record one.");
    }
}
```

`requireWriter` / `requireEditor` (read-only):

```java
/** What {@link #create} checks first, for the controller to run before it converts a recording. */
@Transactional(readOnly = true)
public void requireWriter(UUID eventId, UUID callerUserId) {
    if (!eventRepository.existsById(eventId)) {
        throw new ResourceNotFoundException("Event", eventId);
    }
    actingMemberResolver.actingMember(eventId, callerUserId).orElseGet(() -> requireMember(eventId, callerUserId));
    moduleAvailabilityService.requireAvailable(eventId, ModuleKey.WISHBOOK);
}

/** What {@link #edit} checks, for the controller to run before it converts a recording. */
@Transactional(readOnly = true)
public void requireEditor(UUID entryId, UUID callerUserId) {
    WishbookEntry entry = wishbookEntryRepository.findByIdAndDeletedAtIsNull(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("WishbookEntry", entryId));
    requireAuthor(entry, callerUserId);
    moduleAvailabilityService.requireAvailable(entry.getEvent().getId(), ModuleKey.WISHBOOK);
}
```

Move the author check out of `edit` into `private EventMember requireAuthor(WishbookEntry entry, UUID callerUserId)` (member lookup + `isAuthoredBy` + the 4041 throw, unchanged) and use it from both.

`create` — the 3-argument overload delegates; the new one changes only the message lines:

```java
public WishbookEntryResponseDto create(UUID eventId, WishbookEntryRequestDto dto, UUID callerUserId) {
    return create(eventId, dto, callerUserId, null);
}

@Transactional
public WishbookEntryResponseDto create(UUID eventId, WishbookEntryRequestDto dto, UUID callerUserId,
                                       ProcessedWishAudio audio) {
    // ...existing checks, signature...
    String message = text(dto.getMessage());
    requireTextOrAudio(message, audio != null);
    // ...existing entry setup, with:
    entry.setMessage(message);
    if (audio != null) {
        entry.setAudioKey(wishAudioFiles.store(eventId, audio));
        entry.setAudioDurationMs(audio.durationMs());
    }
    // ...save, log, return as before
}
```

The 3-argument `create` must not be `@Transactional` itself or must stay so — either is fine since it only delegates; keep `@Transactional` on the 4-argument one. **Note:** Spring proxies don't intercept self-calls, so put `@Transactional` on the 3-argument overload too.

`createAnonymous` the same way: a 3-argument overload delegating with null; the 4-argument one uses `text(...)`, `requireTextOrAudio`, `store`.

`edit`:

```java
@Transactional
public WishbookEntryResponseDto edit(UUID entryId, WishbookEntryEditDto dto, UUID callerUserId) {
    return edit(entryId, dto, callerUserId, null);
}

@Transactional
public WishbookEntryResponseDto edit(UUID entryId, WishbookEntryEditDto dto, UUID callerUserId,
                                     ProcessedWishAudio newAudio) {
    WishbookEntry entry = wishbookEntryRepository.findByIdAndDeletedAtIsNull(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("WishbookEntry", entryId));
    UUID eventId = entry.getEvent().getId();
    EventMember member = requireAuthor(entry, callerUserId);
    moduleAvailabilityService.requireAvailable(eventId, ModuleKey.WISHBOOK);

    String message = text(dto.getMessage());
    boolean dropAudio = newAudio == null && dto.isRemoveAudio();
    boolean keepsAudio = newAudio != null || (entry.getAudioKey() != null && !dropAudio);
    requireTextOrAudio(message, keepsAudio);

    boolean changed = false;
    if (!Objects.equals(message, entry.getMessage())) {
        // Invalidated first, as in remove(): the event row is locked before the wish row is written.
        bookInvalidator.invalidate(eventId);
        wishbookEntryRepository.updateMessage(entryId, message);
        changed = true;
    }
    // The book is text-only: a recording change never touches it (spec).
    if (newAudio != null || (dropAudio && entry.getAudioKey() != null)) {
        String oldKey = entry.getAudioKey();
        String key = newAudio == null ? null : wishAudioFiles.store(eventId, newAudio);
        wishbookEntryRepository.updateAudio(entryId, key, newAudio == null ? null : newAudio.durationMs());
        wishAudioFiles.deleteAfterCommit(oldKey);
        changed = true;
    }
    if (changed) {
        // Reload so the response carries what is stored now, star included.
        entityManager.refresh(entry);
        log.info("Member {} edited wish {} on event {}", member.getId(), entryId, eventId);
    }
    return toResponseDto(entry, member, eventHostRepository.existsByEvent_IdAndMember_Id(eventId, member.getId()));
}
```

`remove`:

```java
private void remove(WishbookEntry entry) {
    bookInvalidator.invalidate(entry.getEvent().getId());
    wishAudioFiles.deleteAfterCommit(entry.getAudioKey());
    entry.setAudioKey(null);
    entry.setAudioDurationMs(null);
    entry.setDeletedAt(OffsetDateTime.now());
    wishbookEntryRepository.save(entry);
}
```

`toResponseDto` adds:

```java
boolean mayListen = callerIsHost || isAuthoredBy(entry, caller);
dto.setAudio(mayListen && entry.getAudioKey() != null
        ? new WishAudioDto(storageService.generatePresignedUrl(entry.getAudioKey()), entry.getAudioDurationMs())
        : null);
```

Update the class comment: a wish is text, a recording, or both; who receives the recording.

- [ ] **Step 5: Run the tests to see them pass**

Run: `./gradlew test --tests '*Wishbook*'`
Expected: PASS — the new tests and every existing wishbook test, including `GuestPageLoadStatementsTest` (presigning is local signing, no queries).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/wishbook src/main/java/event_social_media/repository/wishbook src/test/java/event_social_media/service/wishbook
git commit -m "KAN-219: Wishes with recordings: write, edit, delete"
```

---

### Task 8: Controllers and the request size filter

**Files:**
- Create: `J/controller/wishbook/WishPartReader.java`
- Modify: `J/controller/wishbook/WishbookController.java:71-95`, `J/controller/wishbook/AnonymousWishbookController.java:50-57`
- Modify: `J/config/RequestBodyLimitFilter.java:78-131`
- Test: `src/test/java/event_social_media/controller/wishbook/WishbookVoiceControllerTest.java` (new), `RequestBodyLimitFilterTest` (extend; find it with `ls src/test/java/event_social_media/config`), `WishbookControllerSecurityTest`, `VendorEndpointParityTest`

Each of the three routes gets a second handler method with `consumes = MULTIPART_FORM_DATA_VALUE`; the existing JSON one gets `consumes = APPLICATION_JSON_VALUE`. Same path, same `@PreAuthorize` and `@RateLimit` (same `name`, so both count against one limit).

The `wish` part is a **file** part (a `Blob` with `application/json`), read as raw bytes like `BugReportController.readReport`: capped at 64 KB, parsed with the app's `ObjectMapper`, validated with the `Validator`, errors as `MethodArgumentNotValidException` so the 400 has the same field errors as the JSON route.

Order inside a multipart handler: caller/token checks → read `wish` → (QR) acceptance → convert `audio` → service. The converted file is closed in a `finally`.

- [ ] **Step 1: Write the failing controller test**

Use MockMvc like `WishbookControllerSecurityTest` (copy its class annotations and how it authenticates as a user). Mock `WishAudioProcessor` and `StorageService` with `@MockBean`.

```java
private MockMultipartFile wishPart(String json) {
    return new MockMultipartFile("wish", "wish.json", "application/json", json.getBytes(StandardCharsets.UTF_8));
}

private MockMultipartFile audioPart() {
    return new MockMultipartFile("audio", "wish.webm", "audio/webm", new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3});
}

@BeforeEach
void audio() throws Exception {
    when(processor.process(any())).thenAnswer(inv ->
            new ProcessedWishAudio(Files.writeString(Files.createTempFile("w", ".m4a"), "x"), 4000));
    when(storageService.uploadWishAudio(any(), any())).thenReturn("wishbook-audio/e/k.m4a");
    when(storageService.generatePresignedUrl(any())).thenReturn("https://r2.test/k");
}

@Test
void aMemberPostsAVoiceOnlyWish() throws Exception {
    mvc.perform(multipart("/api/events/{id}/wishbook", event.getId()).file(wishPart("{}")).file(audioPart())
                    .with(asUser(guest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").doesNotExist())
            .andExpect(jsonPath("$.audio.durationMs").value(4000));
}

@Test
void theJsonRouteStillWorks() throws Exception {
    mvc.perform(post("/api/events/{id}/wishbook", event.getId()).contentType(APPLICATION_JSON)
                    .content("{\"message\":\"Hi\"}").with(asUser(guest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Hi"));
}

@Test
void aStrangerIsRefusedBeforeAnyConversion() throws Exception {
    mvc.perform(multipart("/api/events/{id}/wishbook", event.getId()).file(wishPart("{}")).file(audioPart())
                    .with(asUser(fixtures.newUser())))
            .andExpect(status().isForbidden());
    verifyNoInteractions(processor);
}

@Test
void anEmptyWishIs3132() throws Exception {
    mvc.perform(multipart("/api/events/{id}/wishbook", event.getId()).file(wishPart("{\"message\":\" \"}"))
                    .with(asUser(guest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(3132));
}

@Test
void aBadWishPartIsMalformed() throws Exception {
    mvc.perform(multipart("/api/events/{id}/wishbook", event.getId()).file(wishPart("not json")).with(asUser(guest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(3002));
}

@Test
void aTooLongMessageInTheWishPartIsAFieldError() throws Exception {
    String json = "{\"message\":\"" + "a".repeat(2001) + "\"}";
    mvc.perform(multipart("/api/events/{id}/wishbook", event.getId()).file(wishPart(json)).with(asUser(guest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.message").exists());
}

@Test
void theAuthorReplacesTheRecordingWithAMultipartPut() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId()).getId();
    mvc.perform(multipart(HttpMethod.PUT, "/api/wishbook/{id}", id).file(wishPart("{\"message\":\"Hi\"}")).file(audioPart())
                    .with(asUser(guest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.audio.durationMs").value(4000));
}

@Test
void someoneElsesMultipartPutIsRefusedBeforeConversion() throws Exception {
    UUID id = wishbookService.create(event.getId(), wish("Hi"), guest.getId()).getId();
    mvc.perform(multipart(HttpMethod.PUT, "/api/wishbook/{id}", id).file(wishPart("{}")).file(audioPart()).with(asUser(host)))
            .andExpect(status().isForbidden());
    verifyNoInteractions(processor);
}

@Test
void aQrGuestPostsAVoiceWish() throws Exception {
    String json = "{\"guestName\":\"Maria\",\"ageConfirmed\":true,\"acceptedTermsVersion\":\"" + termsVersion
            + "\",\"acceptedGuidelinesVersion\":\"" + guidelinesVersion + "\"}";
    mvc.perform(multipart("/api/qr/{token}/wishes", token).file(wishPart(json)).file(audioPart()))
            .andExpect(status().isCreated());
}

@Test
void aQrWishWithoutAcceptanceIsRefusedBeforeConversion() throws Exception {
    mvc.perform(multipart("/api/qr/{token}/wishes", token).file(wishPart("{\"guestName\":\"Maria\"}")).file(audioPart()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(3114));
    verifyNoInteractions(processor);
}
```

Set up the QR `token`, `termsVersion` and `guidelinesVersion` the way `AnonymousWishbookControllerTest` does (copy its setup). Use the JSON error field names the project really returns (look at an existing `jsonPath("$...")` assertion on an error code and on field errors and match them).

Note MockMvc does not run `RequestBodyLimitFilter` unless the test context adds filters; these tests cover the handlers. The filter has its own test in Step 5.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests '*WishbookVoiceControllerTest'`
Expected: FAIL (415 or 404 on the multipart requests).

- [ ] **Step 3: Implement WishPartReader**

```java
package event_social_media.controller.wishbook;

/**
 * Reads the {@code wish} part of a multipart wish request, as {@code BugReportController} reads its
 * {@code report} part: a file part of JSON, capped before Jackson sees it, validated like
 * {@code @Valid @RequestBody}.
 */
@Component
@RequiredArgsConstructor
public class WishPartReader {

    static final long WISH_PART_MAX_BYTES = 64 * 1024;

    private final ObjectMapper objectMapper;
    private final Validator validator;

    public <T> T read(MultipartFile part, Class<T> type, MethodParameter parameter)
            throws IOException, MethodArgumentNotValidException {
        if (part.getSize() > WISH_PART_MAX_BYTES) {
            throw new MaxUploadSizeExceededException(WISH_PART_MAX_BYTES);
        }
        T dto;
        try {
            dto = objectMapper.readValue(part.getBytes(), type);
        } catch (JsonProcessingException ex) {
            throw new BadRequestException(ErrorCode.MALFORMED_REQUEST_BODY, "The wish part is missing or not valid JSON");
        }
        if (dto == null) {
            throw new BadRequestException(ErrorCode.MALFORMED_REQUEST_BODY, "The wish part is missing or not valid JSON");
        }
        BeanPropertyBindingResult errors = new BeanPropertyBindingResult(dto, "wish");
        new SpringValidatorAdapter(validator).validate(dto, errors);
        if (errors.hasErrors()) {
            throw new MethodArgumentNotValidException(parameter, errors);
        }
        return dto;
    }
}
```

Imports as in `BugReportController`.

- [ ] **Step 4: Implement the handlers**

`WishbookController` — add `consumes = MediaType.APPLICATION_JSON_VALUE` to the existing `create` and `edit`, and add:

```java
private static final MethodParameter CREATE_WISH_PART = parameter("createWithAudio", 1);
private static final MethodParameter EDIT_WISH_PART = parameter("editWithAudio", 1);

/** The same write as {@link #create}, as multipart: a {@code wish} JSON part and an optional {@code audio} file (KAN-219). */
@PostMapping(path = "/api/events/{eventId}/wishbook", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
@PreAuthorize("isAuthenticated()")
@RateLimit(name = "wishbook.write", limit = 20, windowSeconds = 60)
public WishbookEntryResponseDto createWithAudio(@PathVariable UUID eventId,
                                                @RequestPart("wish") MultipartFile wish,
                                                @RequestPart(value = "audio", required = false) MultipartFile audio,
                                                Authentication authentication)
        throws IOException, MethodArgumentNotValidException {
    UUID caller = callerId(authentication);
    wishbookService.requireWriter(eventId, caller);
    WishbookEntryRequestDto dto = wishPartReader.read(wish, WishbookEntryRequestDto.class, CREATE_WISH_PART);
    try (ProcessedWishAudio converted = convert(audio)) {
        return wishbookService.create(eventId, dto, caller, converted);
    }
}

@PutMapping(path = "/api/wishbook/{entryId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
@PreAuthorize("isAuthenticated()")
@RateLimit(name = "wishbook.write", limit = 20, windowSeconds = 60)
public WishbookEntryResponseDto editWithAudio(@PathVariable UUID entryId,
                                              @RequestPart("wish") MultipartFile wish,
                                              @RequestPart(value = "audio", required = false) MultipartFile audio,
                                              Authentication authentication)
        throws IOException, MethodArgumentNotValidException {
    UUID caller = callerId(authentication);
    wishbookService.requireEditor(entryId, caller);
    WishbookEntryEditDto dto = wishPartReader.read(wish, WishbookEntryEditDto.class, EDIT_WISH_PART);
    try (ProcessedWishAudio converted = convert(audio)) {
        return wishbookService.edit(entryId, dto, caller, converted);
    }
}

/** null when there is no recording; try-with-resources accepts a null resource. */
private ProcessedWishAudio convert(MultipartFile audio) throws IOException {
    return audio == null || audio.isEmpty() ? null : wishAudioProcessor.process(audio);
}

private static MethodParameter parameter(String method, int index) {
    try {
        return new MethodParameter(WishbookController.class.getMethod(method,
                UUID.class, MultipartFile.class, MultipartFile.class, Authentication.class), index);
    } catch (NoSuchMethodException ex) {
        throw new ExceptionInInitializerError(ex);
    }
}
```

Inject `WishPartReader wishPartReader` and `WishAudioProcessor wishAudioProcessor`.

`AnonymousWishbookController` — `consumes = APPLICATION_JSON_VALUE` on `write`, and:

```java
@PostMapping(path = "/api/qr/{token}/wishes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
@ResponseStatus(HttpStatus.CREATED)
@RateLimit(name = "qr.wishbook.write", limit = 60, windowSeconds = 60)
public AnonymousWishResponseDto writeWithAudio(@PathVariable String token,
                                               @RequestPart("wish") MultipartFile wish,
                                               @RequestPart(value = "audio", required = false) MultipartFile audio)
        throws IOException, MethodArgumentNotValidException {
    QrLink link = qrLinkService.requireGuestAction(token, QrGuestAction.WISH);
    AnonymousWishRequestDto dto = wishPartReader.read(wish, AnonymousWishRequestDto.class, WRITE_WISH_PART);
    AnonymousUploader writer = acceptance(dto);
    try (ProcessedWishAudio converted = audio == null || audio.isEmpty() ? null : wishAudioProcessor.process(audio)) {
        return wishbookService.createAnonymous(link, dto, writer, converted);
    }
}
```

with `WRITE_WISH_PART` built like the others (`String.class, MultipartFile.class, MultipartFile.class`, index 1). A recording counts as one wish against the same rate limit (spec).

- [ ] **Step 5: The size filter**

Add a test to the filter's test class:

```java
@Test
void aWishMayBeMultipartOnItsThreeRoutes() { /* POST /api/events/{id}/wishbook, POST /api/qr/{t}/wishes, PUT /api/wishbook/{id}: chain called */ }

@Test
void aWishBodyOverTheCapIs3128() { /* multipart, Content-Length 6 MB on each route: 413, code 3128 */ }

@Test
void aMultipartPutElsewhereIsStillRefused() { /* PUT /api/wishbook/{id}/highlight multipart: 415 */ }
```

Write them in the style the existing filter tests use (mock request/response or MockMvc with the filter registered).

Then in `RequestBodyLimitFilter`:

```java
/** The wish writes take a recording (KAN-219): POST create, POST from a QR code, PUT edit. */
private static final List<String> WISH_POST_ROUTES = List.of("/api/events/*/wishbook", "/api/qr/*/wishes");
private static final String WISH_PUT_ROUTE = "/api/wishbook/*";

/** 5 MB recording plus the wish part and the multipart envelope. */
public static final long WISH_UPLOAD_MAX_BYTES = WishAudioRejectedException.MAX_BYTES + 128 * 1024;
```

In `doFilterInternal`, replace the multipart branch's route check with a helper and add the cap:

```java
if (isMultipart(request)) {
    boolean wishRoute = isWishUpload(request, path);
    if (!wishRoute && (!HttpMethod.POST.matches(request.getMethod())
            || UPLOAD_ROUTES.stream().noneMatch(route -> PATHS.match(route, path)))) {
        // ...existing 415...
    }
    if (PATHS.match(THEME_FONT_UPLOAD_ROUTE, path) && !withinCap(request, response, path)) {
        return;
    }
    if (wishRoute && !withinWishCap(request, response, path)) {
        return;
    }
    chain.doFilter(request, response);
    return;
}
```

```java
private static boolean isWishUpload(HttpServletRequest request, String path) {
    if (HttpMethod.POST.matches(request.getMethod())) {
        return WISH_POST_ROUTES.stream().anyMatch(route -> PATHS.match(route, path));
    }
    return HttpMethod.PUT.matches(request.getMethod()) && PATHS.match(WISH_PUT_ROUTE, path);
}

/** Like the theme font cap: by declared length, 411 without one. The refusal is the recording's own 3128. */
private boolean withinWishCap(HttpServletRequest request, HttpServletResponse response, String path) throws IOException {
    long declared = request.getContentLengthLong();
    if (declared < 0) {
        log.info("{} {} refused: no Content-Length", request.getMethod(), LoggableUris.mask(path));
        FeedbackRequestSizeFilter.reject(objectMapper, request, response, HttpStatus.LENGTH_REQUIRED,
                ErrorCode.REQUEST_TOO_LARGE, "Content-Length is required");
        return false;
    }
    if (declared > WISH_UPLOAD_MAX_BYTES) {
        log.info("{} {} refused: Content-Length {} exceeds {}", request.getMethod(), LoggableUris.mask(path),
                declared, WISH_UPLOAD_MAX_BYTES);
        reject(request, response, WishAudioRejectedException.tooLarge(declared));
        return false;
    }
    return true;
}
```

(`PATHS.match("/api/wishbook/*", "/api/wishbook/{id}/highlight")` is false, so the highlight route stays refused.) Check how the theme font path rejects with 411 (`ThemeFontRejectedException.lengthRequired()`) and mirror it with the generic `reject(...)` if that is clearer.

`UploadConcurrencyGate` only gates multipart POSTs; a wish recording is small and has its own lanes, so leave it.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests '*WishbookVoiceControllerTest' --tests '*RequestBodyLimitFilter*' --tests '*WishbookControllerSecurityTest' --tests '*AnonymousWishbookControllerTest' --tests '*VendorEndpointParityTest'`
Expected: PASS. If `VendorEndpointParityTest` fails on a new handler, add an entry for it in its `BODIES` map following the existing entries (the multipart variants need a multipart body; if the test can only send JSON, mark them the way it marks other multipart-only routes such as `/api/events/*/media`).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/controller/wishbook src/main/java/event_social_media/config/RequestBodyLimitFilter.java src/test/java/event_social_media
git commit -m "KAN-219: Wish routes accept a recording"
```

---

### Task 9: The book skips voice-only wishes

**Files:**
- Modify: `J/repository/wishbook/WishbookEntryRepository.java:73-76`
- Modify: `J/service/wishbook/book/WishbookBookService.java:61`
- Test: the book tests under `src/test/java/event_social_media/service/wishbook/book/` (extend the loader or service test that builds `BookInput`)

- [ ] **Step 1: Write the failing tests**

```java
@Test
void aVoiceOnlyWishIsNotInTheBook() {
    wishWithText("Hello");
    voiceOnlyWish();
    assertEquals(1, loader.load(event.getId(), ...).wishes().size()); // use the loader's real entry point
}

@Test
void anEventWithOnlyVoiceWishesHasAnEmptyBook() {
    voiceOnlyWish();
    ConflictException ex = assertThrows(ConflictException.class, () -> bookService.request(event.getId(), host.getId(), ...));
    assertEquals(ErrorCode.WISHBOOK_EMPTY, ex.getErrorCode());
}
```

`voiceOnlyWish()` inserts a row with `jdbcTemplate` (`message` null, `audio_key` `'wishbook-audio/x.m4a'`, `audio_duration_ms` 1000) so the test needs no storage mock.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests '*WishbookBook*'`
Expected: FAIL (NPE in `WishbookBookAssembler.toWish`, or the empty-book request succeeds).

- [ ] **Step 3: Implement**

```java
/** The book's wishes with their authors and accounts in one query, oldest first. Text only: a voice-only wish is not printed. */
@Query("select w from WishbookEntry w left join fetch w.authorMember m left join fetch m.user"
        + " where w.event.id = :eventId and w.deletedAt is null and w.message is not null"
        + " order by w.createdAt asc, w.id asc")
List<WishbookEntry> findForBook(@Param("eventId") UUID eventId);

/** Wishes the book would print. */
long countByEvent_IdAndDeletedAtIsNullAndMessageIsNotNull(UUID eventId);
```

In `WishbookBookService.request`, use `countByEvent_IdAndDeletedAtIsNullAndMessageIsNotNull` for the empty check. Search for other users of `countByEvent_IdAndDeletedAtIsNull` (`grep -rn countByEvent_IdAndDeletedAtIsNull src/main`): the host-visible wish count (`WishbookService.count`) keeps counting every wish; anything that decides what the book holds switches to the new count.

- [ ] **Step 4: Run them to see them pass**

Run: `./gradlew test --tests '*WishbookBook*' --tests '*Wishbook*Service*'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/repository/wishbook src/main/java/event_social_media/service/wishbook/book src/test/java/event_social_media/service/wishbook/book
git commit -m "KAN-219: The book prints written wishes only"
```

---

### Task 10: Other readers of the message

Every place that reads `WishbookEntry.getMessage()` must cope with null.

- [ ] **Step 1: Find them**

Run: `grep -rn "getMessage()" src/main/java/event_social_media | grep -i wish`
Expected (at least): `ModerationContentLoader` (Task 11), `NoticeBrowseService` L119–121, the book loader (done in Task 9), the data export used by `MeDataExportWishbookTest`, `WishbookService` (done).

- [ ] **Step 2: Notice picker**

The notice item picker lists wishes by their text. A voice-only wish has none, so leave it out: change the repository method it uses to `findPageByEvent_IdAndDeletedAtIsNullAndMessageIsNotNullOrderByCreatedAtDescIdDesc` and add a test beside the existing notice-picker test (find it with `grep -rln NoticeBrowseService src/test`) that a voice-only wish is not offered.

- [ ] **Step 3: Data export**

Open the account data export that writes wishes (`grep -rn "wishbook" src/main/java/event_social_media/service/user/export` or follow `MeDataExportWishbookTest`). If it writes the message as a string, make sure a null message is written as an empty value without an NPE, and add `hasRecording: true/false`. Do not put the recording or its link in the export (no downloads in this release; KAN-221). Extend `MeDataExportWishbookTest` with a voice-only wish.

- [ ] **Step 4: Run and commit**

Run: `./gradlew test --tests '*Notice*' --tests '*MeDataExport*'`
Expected: PASS.

```bash
git add -A src/main/java src/test/java
git commit -m "KAN-219: Notice picker and data export cope with voice-only wishes"
```

---

### Task 11: Moderation shows the recording

**Files:**
- Modify: `J/service/moderation/ModerationContent.java`, `ModerationContentLoader.java:59-61`, `ModerationCaseService.java:196-207`, `J/dto/moderation/ModerationContentDto.java`
- Test: the moderation case test that already covers a `WISHBOOK_ENTRY` report (`grep -rln WISHBOOK_ENTRY src/test/java/event_social_media/service/moderation`)

- [ ] **Step 1: Write the failing test**

```java
@Test
void aReportedVoiceWishCarriesItsRecording() {
    UUID wishId = voiceOnlyWish(); // jdbcTemplate insert with audio_key 'wishbook-audio/x.m4a', 4200 ms
    ModerationCaseDto c = openCaseFor(ReportTargetType.WISHBOOK_ENTRY, wishId); // the test class's own helper
    assertNull(c.getContent().getText());
    assertEquals(4200, c.getContent().getAudio().durationMs());
    assertNotNull(c.getContent().getAudio().url());
}
```

`StorageService` is mocked in that test or must be: stub `generatePresignedUrl`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests '*Moderation*'`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

`ModerationContent` gets two components and a constructor that keeps every other call site unchanged:

```java
public record ModerationContent(ReportTargetType type, UUID id, UUID eventId, String text, EventMember author,
                                List<Media> media, OffsetDateTime createdAt, String audioKey, Integer audioDurationMs) {

    public ModerationContent(ReportTargetType type, UUID id, UUID eventId, String text, EventMember author,
                             List<Media> media, OffsetDateTime createdAt) {
        this(type, id, eventId, text, author, media, createdAt, null, null);
    }
}
```

`ModerationContentLoader`, the `WISHBOOK_ENTRY` case:

```java
case WISHBOOK_ENTRY -> wishbookEntryRepository.findByIdAndDeletedAtIsNull(id).map(w ->
        new ModerationContent(type, id, w.getEvent().getId(), w.getMessage(), w.getAuthorMember(), List.of(),
                w.getCreatedAt(), w.getAudioKey(), w.getAudioDurationMs()));
```

`ModerationContentDto` adds `private WishAudioDto audio;` (null for every other target type).

`ModerationCaseService.toContentDto` adds:

```java
dto.setAudio(c.audioKey() == null ? null
        : new WishAudioDto(storageService.generatePresignedUrl(c.audioKey()), c.audioDurationMs()));
```

(inject `StorageService` if the class doesn't have it). `ModerationService.snapshot` stays as it is: the decision record keeps text and metadata, not the recording.

- [ ] **Step 4: Run and commit**

Run: `./gradlew test --tests '*Moderation*'`
Expected: PASS.

```bash
git add src/main/java/event_social_media/service/moderation src/main/java/event_social_media/dto/moderation src/test/java/event_social_media/service/moderation
git commit -m "KAN-219: Moderation can play a reported voice wish"
```

---

### Task 12: Purges — event and account

**Files:**
- Modify: `J/service/billing/MediaPurgeService.java:236-255`
- Modify: `J/service/user/deletion/UserAnonymizer.java:120-171`
- Test: `MediaPurgeService`'s test (`grep -rln "purgeExpiredEvents\|purgeOne" src/test`), `UserAnonymizer`'s test (`grep -rln UserAnonymizer src/test`)

- [ ] **Step 1: Write the failing tests**

Event purge (in the purge test, which mocks storage already or should):

```java
@Test
void anExpiredEventsRecordingsAreDeleted() throws Exception {
    // an expired event as the existing tests set one up
    assertTrue(purgeService.purgeExpiredEvents() >= 1);
    verify(storageService).deleteWishAudioObjects(event.getId());
}

@Test
void aFailedRecordingDeleteDefersTheEvent() throws Exception {
    doThrow(new IOException("R2 down")).when(storageService).deleteWishAudioObjects(event.getId());
    purgeService.purgeExpiredEvents();
    assertTrue(eventRepository.existsById(event.getId()));
}
```

Account deletion:

```java
@Test
void theAccountsRecordingsGo() {
    UUID textAndVoice = insertWish(user, "Hello", "wishbook-audio/a.m4a");
    UUID voiceOnly = insertWish(user, null, "wishbook-audio/b.m4a");

    List<String> keys = anonymizer.anonymize(user.getId());

    assertTrue(keys.containsAll(List.of("wishbook-audio/a.m4a", "wishbook-audio/b.m4a")));
    assertEquals("Hello", message(textAndVoice));
    assertNull(audioKey(textAndVoice));
    assertNotNull(deletedAt(voiceOnly));
    assertNull(audioKey(voiceOnly));
}
```

`insertWish` uses `jdbcTemplate` with `author_user_id = user.id`. Read the columns back with `jdbcTemplate.queryForObject`.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests '*MediaPurge*' --tests '*UserAnonymizer*'`
Expected: FAIL.

- [ ] **Step 3: Implement the event purge**

In `purgeOne`, right before the book step (same pattern, inject `WishAudioFiles`):

```java
// The wish recordings live under their own prefix; their rows cascade with the event.
if (!wishAudioFiles.deleteForEvent(event.getId())) {
    log.warn("Event {}'s wish recordings could not be deleted; deferring removal", event.getId());
    return false;
}
```

Do not touch `OrphanedObjectSweepService`: it lists only `events/` and never sees `wishbook-audio/`. Add one line to its class comment saying so, so nobody later widens its listing without teaching it about wish recordings.

- [ ] **Step 4: Implement the account part**

In `anonymize`, after the `wishes` signature update and before building `keys`:

```java
// A deleted account's recordings go (owner decision 2026-11-16): a wish with text keeps its text, a
// voice-only wish goes with its recording. The files are deleted by the caller after commit, with the
// picture and logos. The book is text-only, so this doesn't change what it prints.
String authoredBy = "(author_user_id = :id or author_member_id in (select id from event_members where user_id = :id))";
@SuppressWarnings("unchecked")
List<String> audioKeys = (List<String>) em.createNativeQuery(
                "select audio_key from wishbook_entries where audio_key is not null and " + authoredBy)
        .setParameter("id", userId).getResultList();
em.createNativeQuery("update wishbook_entries set deleted_at = now() where deleted_at is null"
                + " and message is null and audio_key is not null and " + authoredBy)
        .setParameter("id", userId).executeUpdate();
em.createNativeQuery("update wishbook_entries set audio_key = null, audio_duration_ms = null"
                + " where audio_key is not null and " + authoredBy)
        .setParameter("id", userId).executeUpdate();
```

and `keys.addAll(audioKeys);` with the others. Update the `@return` comment: "…and the account's wish recordings". Check `UserPurgeService` (L51) deletes every returned key with `storageService.deleteFile`; a `wishbook-audio/` key needs nothing special there.

- [ ] **Step 5: Run and commit**

Run: `./gradlew test --tests '*MediaPurge*' --tests '*UserAnonymizer*' --tests '*UserPurge*' --tests '*OrphanSweep*'`
Expected: PASS.

```bash
git add src/main/java/event_social_media/service/billing src/main/java/event_social_media/service/user/deletion src/test/java/event_social_media
git commit -m "KAN-219: Purges delete wish recordings"
```

---

### Task 13: Docs, full check, PR

- [ ] **Step 1: FE guide**

In `docs/fe-guides/wishlist-wishbook-cohost-fe-integration.md`, add a "Voice wishes (KAN-219)" section:

- The three routes accept `multipart/form-data` with a `wish` part (a `Blob` of JSON, `application/json`; a plain string field is rejected as a missing part) and an optional `audio` part (the recording file). JSON bodies keep working.
- `message` is optional when a recording is sent; `PUT` adds `removeAudio`.
- Accepted recordings: WebM, Ogg or MP4 with a sound track, up to 5 MB and 62 s. Stored as mono AAC `.m4a`.
- Response: `audio: { url, durationMs } | null`, for hosts, co-hosts and the author only. The URL is presigned and short-lived; refetch the list for a fresh one.
- `ModerationContentDto.audio`, same shape.
- Errors: 3128 (413) too large, 3129 not audio, 3130 too long, 3131 (422) could not be saved, 3132 neither text nor recording.
- The book prints written wishes only.

- [ ] **Step 2: Full check**

Run: `./gradlew clean test`
Expected: BUILD SUCCESSFUL. Run `./gradlew test --tests '*WishAudioProcessorFfmpegIntegrationTest'` with ffmpeg installed and note in the PR whether it ran or skipped.

- [ ] **Step 3: Local smoke test**

Start the app locally with ffmpeg on PATH. Post a recording made with ffmpeg:

```bash
ffmpeg -f lavfi -i sine=frequency=440:duration=3 -c:a libopus /tmp/wish.webm
```

then `curl -F 'wish=@-;type=application/json' -F 'audio=@/tmp/wish.webm' ...` against `POST /api/events/{id}/wishbook` with a signed-in guest's token (`echo '{}' |` for the `-` part). Expect 200 with `audio.durationMs` ≈ 3000, and an object under `wishbook-audio/{eventId}/` in the dev bucket. Open `audio.url` in a browser: it plays.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin claude/kan-219-voice-wishes
gh pr create --base staging --title "KAN-219: Voice wishes" --body-file <body>
```

Body: what changed (short), the deploy note (migration V227; ffmpeg already in the runtime image; two optional env vars `WISHBOOK_AUDIO_MAX_CONCURRENT`, `WISHBOOK_AUDIO_WAIT_SECONDS`), "Needs #163 first" while Part 1 is open, how the ffmpeg integration test ran, and the attribution line. Name only KAN-219 in the body.

---

## Self-review notes

- Spec coverage: migration (T1), message nullable + text-or-audio (T1, T2, T7), multipart on all three routes with JSON kept (T8), `removeAudio` (T2, T7), `audio` for hosts/author only (T7), 5 MB / type / 62 s / AAC m4a / metadata stripped (T4, T5), private storage + delete on rollback (T6), old objects deleted after commit (T6, T7), purge on event and account deletion (T12), orphan sweep can't see the prefix (T6, T12), one error code each (T3), QR rate limit unchanged (T8), book text-only and not invalidated by audio changes (T7, T9), moderation playback (T11).
- Departures from the spec, all owner-approved on 2026-11-16: own prefix instead of teaching the orphan sweep; deletes after commit instead of a wish purge path (none exists); account deletion removes voice-only wishes.
- Added beyond the spec: 3132 for "neither text nor recording"; conversion lanes (busy → 3131); notice picker and data export null-safety.
