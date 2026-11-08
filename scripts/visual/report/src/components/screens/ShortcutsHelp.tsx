import { Fragment } from 'react';

import { copy } from '../../copy';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const SHORTCUTS: { keys: string[]; text: string }[] = [
    { keys: ['←', '→'], text: copy.previousOrNext },
    { keys: ['R'], text: copy.looksRightThenNext },
    { keys: ['C'], text: copy.nextCapture },
    { keys: ['1', '2', '3'], text: copy.compareKeys },
    { keys: ['Z'], text: copy.zoomKeys },
    { keys: ['G'], text: copy.modeKeys },
    { keys: ['/'], text: copy.findStory },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
    const closeRef = useDialogFocus<HTMLButtonElement>();
    return (
        <>
            {/* Backdrop */}
            <div className="scrim" onClick={onClose} />

            {/* Shortcuts */}
            <div className="help" role="dialog" aria-modal="true" aria-label={copy.shortcuts}>
                <h2>{copy.shortcuts}</h2>
                <dl>
                    {SHORTCUTS.map(({ keys, text }) => (
                        <Fragment key={text}>
                            <dt>
                                {keys.map((key) => (
                                    <kbd key={key}>{key}</kbd>
                                ))}
                            </dt>
                            <dd>{text}</dd>
                        </Fragment>
                    ))}
                </dl>
                <button type="button" className="btn" ref={closeRef} onClick={onClose}>
                    {copy.close}
                </button>
            </div>
        </>
    );
}
