export function findMissingStories(added: string[], exists: (path: string) => boolean): string[] {
    return added.filter(
        (file) =>
            file.startsWith('components/') &&
            file.endsWith('.tsx') &&
            !file.endsWith('.test.tsx') &&
            !file.endsWith('.stories.tsx') &&
            !exists(file.replace(/\.tsx$/, '.stories.tsx')),
    );
}
