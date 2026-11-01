# My business page — Android admin app (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a notification when a vendor writes to us from their business page (Spring push type `VENDOR_MESSAGE`). Today the app drops push types it doesn't know.

**Architecture:** One new `PushMessage` case, parsed from the FCM data, written in the phone's language by `PushTexts`, sent on the existing `PARTNERS` channel, and opening the console's `#vendor-messages` section in the browser (the app has no screen for it).

**Tech Stack:** Kotlin, JUnit 4, Android resources (`values`, `values-el`).

**Spec:** `docs/superpowers/specs/2026-11-01-my-business-page-design.md` in the storywall repo. **Backend contract:** `AdminAlert.vendorMessage(topic, name, messageId)` sends data `type=VENDOR_MESSAGE`, `link=#vendor-messages`, `topic` (`QUESTION|PROBLEM|PARTNERSHIP|OTHER`), `name` (business name, may be empty), `messageId`.

**Repo:** `C:\Users\User\IdeaProjects\storywall-admin-android`. PRs go into `main`.

---

## File structure

| File | Change |
|---|---|
| `app/src/main/java/gr/storywall/admin/push/PushMessage.kt` | `VendorMessage` case and its parsing |
| `app/src/main/java/gr/storywall/admin/push/PushTexts.kt` | its title and body |
| `app/src/main/java/gr/storywall/admin/push/Channels.kt` | `PARTNERS` channel |
| `app/src/main/res/values/strings.xml`, `app/src/main/res/values-el/strings.xml` | 5 strings each |
| `app/src/test/java/gr/storywall/admin/push/PushMessageTest.kt`, `PushTextsTest.kt` | tests |

`Notifications.kt` needs no change: its `else` branch already opens `ConsoleLinks.url(SITE_URL, link)`.

---

### Task 0: Branch

- [ ] **Step 1**

```bash
cd /c/Users/User/IdeaProjects/storywall-admin-android
git fetch origin
git switch -c feat/vendor-message-push origin/main
```

---

### Task 1: Parse `VENDOR_MESSAGE`

**Files:**
- Modify: `app/src/main/java/gr/storywall/admin/push/PushMessage.kt`
- Modify: `app/src/main/java/gr/storywall/admin/push/Channels.kt`
- Test: `app/src/test/java/gr/storywall/admin/push/PushMessageTest.kt`

- [ ] **Step 1: Write the failing tests** (add to `PushMessageTest`)

```kotlin
    @Test
    fun readsAVendorMessage() {
        assertEquals(
            PushMessage.VendorMessage(topic = "PROBLEM", name = "Studio Lumen", link = "#vendor-messages"),
            parsePush(mapOf("type" to "VENDOR_MESSAGE", "link" to "#vendor-messages", "topic" to "PROBLEM", "name" to "Studio Lumen", "messageId" to "m1")),
        )
        assertEquals(
            PushMessage.VendorMessage(topic = "QUESTION", name = null, link = "#vendor-messages"),
            parsePush(mapOf("type" to "VENDOR_MESSAGE", "link" to "#vendor-messages", "topic" to "QUESTION", "name" to "")),
        )
        assertEquals(Channel.PARTNERS, Channel.of(PushMessage.VendorMessage("OTHER", null, "#vendor-messages")))
    }

    @Test
    fun aVendorMessageWithoutATopicIsDropped() {
        assertNull(parsePush(mapOf("type" to "VENDOR_MESSAGE", "link" to "#vendor-messages", "name" to "Studio Lumen")))
    }
```

- [ ] **Step 2: Run to see them fail**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushMessageTest" -q`
Expected: compile error — `Unresolved reference: VendorMessage`.

- [ ] **Step 3: Add the case** (in `sealed interface PushMessage`, after `OutreachRequest`)

```kotlin
    /**
     * A vendor wrote to us from their business page about [topic] (QUESTION, PROBLEM, PARTNERSHIP or OTHER;
     * an unknown one still shows). [name] is their business name, null when Spring sent none. Opens the
     * console's inbox.
     */
    data class VendorMessage(val topic: String, val name: String?, override val link: String) : PushMessage
```

- [ ] **Step 4: Parse it** (in `parsePush`, before `else -> null`)

```kotlin
        "VENDOR_MESSAGE" -> PushMessage.VendorMessage(
            topic = data["topic"]?.takeIf { it.isNotBlank() } ?: return null,
            name = data["name"]?.takeIf { it.isNotBlank() },
            link = link,
        )
```

- [ ] **Step 5: Channel** (in `Channels.kt`, `of`)

```kotlin
            is PushMessage.FollowupsDue, is PushMessage.OutreachRequest, is PushMessage.VendorMessage -> PARTNERS
```

- [ ] **Step 6: Run the tests**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushMessageTest" -q`
Expected: compile error in `PushTexts.kt` (`when` is not exhaustive) — fixed in Task 2. If you want a green run here, do Task 2 Step 3 first.

---

### Task 2: The notification's text

**Files:**
- Modify: `app/src/main/res/values/strings.xml`, `app/src/main/res/values-el/strings.xml` (after `push_request_body`)
- Modify: `app/src/main/java/gr/storywall/admin/push/PushTexts.kt`
- Test: `app/src/test/java/gr/storywall/admin/push/PushTextsTest.kt`

- [ ] **Step 1: Write the failing test** (add to `PushTextsTest`)

```kotlin
    @Test
    fun aVendorMessageNamesTheBusinessAndTopic() {
        assertEquals(PushText("Message from Studio Lumen", "Problem"),
            texts.of(PushMessage.VendorMessage("PROBLEM", "Studio Lumen", "#vendor-messages")))
        assertEquals(PushText("Message from a business", "Partnership"),
            texts.of(PushMessage.VendorMessage("PARTNERSHIP", null, "#vendor-messages")))
        assertEquals(PushText("Message from a business", null),
            texts.of(PushMessage.VendorMessage("SOMETHING_NEW", null, "#vendor-messages")))
    }
```

`TestStrings` reads `values/strings.xml`, so the English strings below are what the test sees.

- [ ] **Step 2: Strings** — `values/strings.xml`:

```xml
    <string name="push_vendor_title">Message from %1$s</string>
    <string name="push_vendor_title_unnamed">Message from a business</string>
    <string name="push_vendor_question">Question</string>
    <string name="push_vendor_problem">Problem</string>
    <string name="push_vendor_partnership">Partnership</string>
    <string name="push_vendor_other">Other</string>
```

`values-el/strings.xml`:

```xml
    <string name="push_vendor_title">Μήνυμα από %1$s</string>
    <string name="push_vendor_title_unnamed">Μήνυμα από επιχείρηση</string>
    <string name="push_vendor_question">Ερώτηση</string>
    <string name="push_vendor_problem">Πρόβλημα</string>
    <string name="push_vendor_partnership">Συνεργασία</string>
    <string name="push_vendor_other">Άλλο</string>
```

- [ ] **Step 3: Text** (in `PushTexts.of`, after the `OutreachRequest` branch)

```kotlin
        is PushMessage.VendorMessage -> PushText(
            message.name?.let { s(R.string.push_vendor_title, it) } ?: s(R.string.push_vendor_title_unnamed),
            when (message.topic) {
                "QUESTION" -> s(R.string.push_vendor_question)
                "PROBLEM" -> s(R.string.push_vendor_problem)
                "PARTNERSHIP" -> s(R.string.push_vendor_partnership)
                "OTHER" -> s(R.string.push_vendor_other)
                else -> null
            },
        )
```

- [ ] **Step 4: Run the push tests**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.*" -q`
Expected: PASS.

- [ ] **Step 5: Full unit tests and lint**

Run: `./gradlew :app:testDebugUnitTest :app:lintDebug -q`
Expected: PASS, no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(push): notify on vendor messages from the business page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Check on a phone and open the PR

- [ ] **Step 1:** With the backend branch running on staging, send a message from `/business` on staging as a vendor test account. Check the phone (R5CY92WHZBR, not the emulator) shows "Message from …" with the topic, and a tap opens the console's Vendor messages section.
- [ ] **Step 2:** After the user's OK, push `feat/vendor-message-push` and open a PR into `main` titled `feat(push): vendor message notifications`, ending with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
