// The Vendors empty-state picture: an event scene with one figure per vendor type.
// Drawn in viewBox units cropped to "0 30 640 200"; marker centres live in VENDOR_SCENE_MARKERS (lib/vendors.ts).
// Each type is its own group, so the types the plan doesn't allow are left out.

import { VENDOR_SCENE_VIEWBOX, type VendorSceneType } from '@/lib/vendors';

export function VendorSceneArt({ types }: { types: readonly VendorSceneType[] }) {
    const shows = (type: VendorSceneType) => types.includes(type);
    const { x, y, width, height } = VENDOR_SCENE_VIEWBOX;

    return (
        <svg
            viewBox={`${x} ${y} ${width} ${height}`}
            className="block h-auto w-full"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {/* Ground and string lights */}
            <g data-vendor-type="base">
                <ellipse cx="320" cy="222" rx="312" ry="10" fill="#f3ece4" />
                <path d="M20 40 Q170 80 330 46 Q480 80 630 40" stroke="#c8b9a8" strokeWidth="1" fill="none" />
                <g fill="#ffd27a">
                    <circle cx="80" cy="56" r="2.6" />
                    <circle cx="142" cy="63" r="2.6" />
                    <circle cx="204" cy="64" r="2.6" />
                    <circle cx="266" cy="60" r="2.6" />
                    <circle cx="390" cy="60" r="2.6" />
                    <circle cx="450" cy="64" r="2.6" />
                    <circle cx="510" cy="63" r="2.6" />
                    <circle cx="570" cy="56" r="2.6" />
                </g>
            </g>
            {/* Venue: stone manor */}
            {shows('VENUE') && (
                <g data-vendor-type="VENUE">
                    <rect x="262" y="48" width="10" height="16" fill="#c9b8a5" />
                    <rect x="388" y="48" width="10" height="16" fill="#c9b8a5" />
                    <polygon points="228,92 250,62 410,62 432,92" fill="#8c8f9c" />
                    <rect x="236" y="92" width="188" height="110" fill="#f4e7d8" />
                    <g fill="#cfdbe3" stroke="#fff" strokeWidth="1.5">
                        <rect x="250" y="102" width="14" height="22" rx="1" />
                        <rect x="278" y="102" width="14" height="22" rx="1" />
                        <rect x="368" y="102" width="14" height="22" rx="1" />
                        <rect x="396" y="102" width="14" height="22" rx="1" />
                        <rect x="250" y="140" width="14" height="24" rx="1" />
                        <rect x="396" y="140" width="14" height="24" rx="1" />
                    </g>
                    <rect x="246" y="126" width="22" height="3" fill="#e2d2bf" />
                    <rect x="392" y="126" width="22" height="3" fill="#e2d2bf" />
                    <path d="M316 202 V164 a14 14 0 0 1 28 0 V202 Z" fill="#6e5444" />
                    <rect x="300" y="200" width="60" height="4" fill="#e2d2bf" />
                    <g fill="#7fa577">
                        <ellipse cx="240" cy="110" rx="6" ry="9" />
                        <ellipse cx="243" cy="132" rx="7" ry="10" />
                        <ellipse cx="239" cy="158" rx="6" ry="11" />
                        <ellipse cx="244" cy="184" rx="8" ry="12" />
                    </g>
                </g>
            )}
            {/* Decoration: flower arch */}
            {shows('DECORATION') && (
                <g data-vendor-type="DECORATION">
                    <path d="M292 220 V160 a38 38 0 0 1 76 0 V220" stroke="#d9cbb8" strokeWidth="3" fill="none" />
                    <g fill="#6f9a6a">
                        <ellipse cx="292" cy="150" rx="9" ry="3.5" transform="rotate(-70 292 150)" />
                        <ellipse cx="300" cy="134" rx="9" ry="3.5" transform="rotate(-40 300 134)" />
                        <ellipse cx="312" cy="124" rx="9" ry="3.5" transform="rotate(-15 312 124)" />
                        <ellipse cx="288" cy="168" rx="9" ry="3.5" transform="rotate(-100 288 168)" />
                        <ellipse cx="370" cy="196" rx="9" ry="3.5" transform="rotate(80 370 196)" />
                        <ellipse cx="364" cy="214" rx="10" ry="4" transform="rotate(20 364 214)" />
                        <ellipse cx="380" cy="215" rx="10" ry="4" transform="rotate(-20 380 215)" />
                        <ellipse cx="344" cy="124" rx="8" ry="3" transform="rotate(20 344 124)" />
                    </g>
                    <g fill="#8bb17f">
                        <ellipse cx="296" cy="142" rx="7" ry="3" transform="rotate(-55 296 142)" />
                        <ellipse cx="306" cy="128" rx="7" ry="3" transform="rotate(-30 306 128)" />
                        <ellipse cx="372" cy="205" rx="7" ry="3" transform="rotate(60 372 205)" />
                    </g>
                    <circle cx="294" cy="140" r="6" fill="#f4a6b8" />
                    <circle cx="294" cy="140" r="2.4" fill="#e57f98" />
                    <circle cx="304" cy="127" r="6.5" fill="#fff5ee" stroke="#f0d9c8" />
                    <circle cx="304" cy="127" r="2.4" fill="#f0d9c8" />
                    <circle cx="318" cy="121" r="5.5" fill="#ffc49a" />
                    <circle cx="318" cy="121" r="2.2" fill="#f2a46f" />
                    <circle cx="290" cy="158" r="5" fill="#ffc49a" />
                    <circle cx="290" cy="158" r="2" fill="#f2a46f" />
                    <circle cx="330" cy="120" r="5" fill="#f4a6b8" />
                    <circle cx="330" cy="120" r="2" fill="#e57f98" />
                    <circle cx="368" cy="186" r="6" fill="#fff5ee" stroke="#f0d9c8" />
                    <circle cx="368" cy="186" r="2.4" fill="#f0d9c8" />
                    <circle cx="372" cy="210" r="6.5" fill="#f4a6b8" />
                    <circle cx="372" cy="210" r="2.4" fill="#e57f98" />
                    <circle cx="360" cy="214" r="5" fill="#ffc49a" />
                    <circle cx="360" cy="214" r="2" fill="#f2a46f" />
                </g>
            )}
            {/* Photographer */}
            {shows('PHOTOGRAPHER') && (
                <g data-vendor-type="PHOTOGRAPHER">
                    <path d="M74 168 L70 218 M86 168 L92 218" stroke="#2b2b33" strokeWidth="9" />
                    <ellipse cx="70" cy="220" rx="7" ry="3" fill="#1d1a17" />
                    <ellipse cx="95" cy="220" rx="7" ry="3" fill="#1d1a17" />
                    <path d="M69 126 Q84 134 92 112" stroke="#34313b" strokeWidth="7" fill="none" />
                    <path d="M66 122 Q80 116 94 122 L92 172 L68 172 Z" fill="#3d3a45" />
                    <rect x="77" y="110" width="6" height="8" fill="#e0a985" />
                    <circle cx="80" cy="102" r="10" fill="#e9b996" />
                    <path d="M70 104 Q68 89 81 90 Q91 91 90 99 L84 96 Q76 96 73 104 Z" fill="#3b2a20" />
                    <circle cx="70" cy="93" r="5" fill="#3b2a20" />
                    <rect x="88" y="96" width="18" height="12" rx="2" fill="#1d1a17" />
                    <rect x="92" y="93" width="6" height="4" rx="1" fill="#1d1a17" />
                    <rect x="104" y="98.5" width="8" height="8" rx="1" fill="#2b2b33" />
                    <circle cx="112" cy="102.5" r="2.6" fill="#6b7c8f" />
                    <path d="M91 126 Q104 134 98 110" stroke="#3d3a45" strokeWidth="7" fill="none" />
                    <circle cx="98" cy="109" r="3.4" fill="#e9b996" />
                </g>
            )}
            {/* Videographer */}
            {shows('VIDEOGRAPHER') && (
                <g data-vendor-type="VIDEOGRAPHER">
                    <path d="M155 172 L152 218 M167 172 L172 218" stroke="#4a5160" strokeWidth="10" />
                    <ellipse cx="151" cy="220" rx="7.5" ry="3" fill="#1d1a17" />
                    <ellipse cx="175" cy="220" rx="7.5" ry="3" fill="#1d1a17" />
                    <path d="M146 124 Q160 117 174 124 L172 174 L148 174 Z" fill="#7a8a72" />
                    <path d="M148 128 Q144 150 152 160" stroke="#6b7a64" strokeWidth="7" fill="none" />
                    <rect x="157" y="111" width="6" height="8" fill="#c98f6c" />
                    <circle cx="160" cy="104" r="10" fill="#d9a07c" />
                    <path d="M150 102 Q151 91 161 91 Q170 92 170 101 Z" fill="#2b2b33" />
                    <rect x="166" y="99" width="10" height="3" rx="1.5" fill="#2b2b33" />
                    <rect x="164" y="106" width="30" height="14" rx="3" fill="#1d1a17" />
                    <rect x="194" y="108" width="11" height="10" rx="1" fill="#2b2b33" />
                    <circle cx="205" cy="113" r="3" fill="#6b7c8f" />
                    <rect x="160" y="101" width="8" height="6" rx="1" fill="#2b2b33" />
                    <path d="M170 106 v-5 h16 v5" stroke="#1d1a17" strokeWidth="2" fill="none" />
                    <rect x="184" y="97" width="13" height="3" rx="1.5" fill="#2b2b33" />
                    <path d="M172 128 Q186 134 190 121" stroke="#7a8a72" strokeWidth="8" fill="none" />
                    <circle cx="190" cy="120" r="3.6" fill="#d9a07c" />
                </g>
            )}
            {/* Planner with headset and tablet */}
            {shows('PLANNER') && (
                <g data-vendor-type="PLANNER">
                    <path d="M445 174 L443 218 M455 174 L458 218" stroke="#2b2b33" strokeWidth="8" />
                    <path d="M440 220 l-6 0 M461 220 l6 0" stroke="#1d1a17" strokeWidth="4" />
                    <path d="M436 124 Q450 117 464 124 L462 176 L438 176 Z" fill="#c9705a" />
                    <path d="M446 122 L450 136 L454 122 Z" fill="#fff" />
                    <path d="M462 128 Q468 150 462 162" stroke="#b5634f" strokeWidth="7" fill="none" />
                    <circle cx="462" cy="163" r="3.2" fill="#f0c2a2" />
                    <rect x="447" y="111" width="6" height="8" fill="#e5b292" />
                    <circle cx="450" cy="104" r="10" fill="#f0c2a2" />
                    <path d="M440 106 Q438 90 451 90 Q462 90 461 102 Q455 95 446 97 Q442 99 441 107 Z" fill="#6b3f2a" />
                    <path d="M459 95 Q472 101 467 118 Q463 108 457 101 Z" fill="#6b3f2a" />
                    <path d="M441 100 Q450 85 460 100" stroke="#2b2b33" strokeWidth="1.5" fill="none" />
                    <path d="M441 104 Q441 112 447 112" stroke="#2b2b33" strokeWidth="1.5" fill="none" />
                    <path d="M439 128 Q428 138 431 146" stroke="#c9705a" strokeWidth="7" fill="none" />
                    <g transform="rotate(-12 432 144)">
                        <rect x="422" y="132" width="17" height="23" rx="2" fill="#2b2b33" />
                        <rect x="424" y="134" width="13" height="19" rx="1" fill="#cfdbe3" />
                        <rect x="426" y="137" width="9" height="2" fill="#fff" />
                        <rect x="426" y="141" width="7" height="2" fill="#fff" />
                    </g>
                    <circle cx="433" cy="147" r="3.2" fill="#f0c2a2" />
                </g>
            )}
            {/* Catering: cake table */}
            {shows('CATERING') && (
                <g data-vendor-type="CATERING">
                    <path d="M486 170 H574 L579 219 H481 Z" fill="#fffaf5" stroke="#eadfd2" />
                    <path
                        d="M496 172 Q500 196 494 219 M530 172 Q534 196 530 219 M564 172 Q568 196 566 219"
                        stroke="#f1e6da"
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <rect x="484" y="166" width="92" height="6" rx="2" fill="#f4ece2" />
                    <rect x="500" y="146" width="32" height="20" rx="2" fill="#fff" stroke="#eadfd2" />
                    <rect x="505" y="130" width="22" height="16" rx="2" fill="#fff" stroke="#eadfd2" />
                    <rect x="509" y="118" width="14" height="12" rx="2" fill="#fff" stroke="#eadfd2" />
                    <path d="M500 156 h32 M505 139 h22" stroke="#f3dbe2" strokeWidth="1.5" />
                    <circle cx="516" cy="116" r="3.6" fill="#f4a6b8" />
                    <circle cx="524" cy="144" r="3.4" fill="#f4a6b8" />
                    <circle cx="506" cy="146" r="3" fill="#ffc49a" />
                    <ellipse cx="513" cy="145" rx="3" ry="1.4" fill="#7fa577" />
                    <g fill="#f6e6b8" stroke="#d9c99a" strokeWidth="0.8">
                        <polygon points="541,148 549,148 546.5,158 543.5,158" />
                        <polygon points="551,150 559,150 556.5,160 553.5,160" />
                    </g>
                    <path d="M545 158 v8 M555 160 v6" stroke="#d9c99a" strokeWidth="1.2" />
                    <rect x="562" y="146" width="7" height="20" rx="2" fill="#3f5a45" />
                    <rect x="564" y="139" width="3" height="8" fill="#3f5a45" />
                    <rect x="562" y="152" width="7" height="6" fill="#e9dcc0" />
                </g>
            )}
            {/* Music: guitarist and amp */}
            {shows('MUSIC') && (
                <g data-vendor-type="MUSIC">
                    <path d="M596 174 L594 218 M606 174 L609 218" stroke="#34405a" strokeWidth="9" />
                    <ellipse cx="592" cy="220" rx="7" ry="3" fill="#5a3a26" />
                    <ellipse cx="612" cy="220" rx="7" ry="3" fill="#5a3a26" />
                    <path d="M588 124 Q600 117 612 124 L610 176 L590 176 Z" fill="#ebe5da" />
                    <path d="M592 124 L598 176 M608 124 L602 176" stroke="#3a3a46" strokeWidth="5" />
                    <rect x="597" y="111" width="6" height="8" fill="#a8704e" />
                    <circle cx="600" cy="104" r="10" fill="#b57a56" />
                    <g fill="#2b1d16">
                        <circle cx="593" cy="96" r="5" />
                        <circle cx="600" cy="93" r="5.5" />
                        <circle cx="607" cy="96" r="5" />
                        <circle cx="609" cy="102" r="3.5" />
                    </g>
                    <path d="M580 152 L554 125" stroke="#6b4423" strokeWidth="4" />
                    <rect x="548" y="118" width="8" height="8" rx="1.5" fill="#4a2f1d" transform="rotate(-45 552 122)" />
                    <ellipse cx="590" cy="160" rx="13" ry="11" fill="#c88a4a" />
                    <ellipse cx="584" cy="149" rx="10" ry="8" fill="#c88a4a" />
                    <circle cx="586" cy="153" r="3.2" fill="#4a2f1d" />
                    <path d="M596 165 h-8" stroke="#4a2f1d" strokeWidth="1.6" />
                    <path d="M590 128 Q574 134 566 134" stroke="#ebe5da" strokeWidth="7" fill="none" />
                    <circle cx="565" cy="134" r="3.2" fill="#b57a56" />
                    <path d="M610 128 Q608 150 596 156" stroke="#ebe5da" strokeWidth="7" fill="none" />
                    <circle cx="595" cy="156" r="3.2" fill="#b57a56" />
                    <rect x="616" y="194" width="20" height="26" rx="2" fill="#2b2b33" />
                    <circle cx="626" cy="209" r="6" fill="#4a4a56" />
                    <circle cx="626" cy="209" r="2.4" fill="#2b2b33" />
                    <rect x="619" y="197" width="14" height="3" rx="1" fill="#c88a4a" />
                </g>
            )}
        </svg>
    );
}
