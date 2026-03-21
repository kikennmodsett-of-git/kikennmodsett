export const SpriteDB = {
    getSprite(shape, color = "#00ff00") {
        const svgStart = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; image-rendering:pixelated;">`;
        const svgEnd = `</svg>`;

        const sprites = {
            slime: `
                <rect x="8" y="16" width="16" height="12" fill="${color}" />
                <rect x="10" y="14" width="12" height="2" fill="${color}" />
                <rect x="6" y="20" width="20" height="6" fill="${color}" opacity="0.8"/>
                <rect x="10" y="18" width="2" height="2" fill="#000" />
                <rect x="20" y="18" width="2" height="2" fill="#000" />
                <rect x="10" y="10" width="4" height="4" fill="#fff" opacity="0.3" />
            `,
            beast: `
                <rect x="6" y="14" width="20" height="12" fill="${color}" />
                <rect x="4" y="12" width="6" height="6" fill="${color}" />
                <rect x="22" y="12" width="6" height="6" fill="${color}" />
                <rect x="10" y="26" width="4" height="4" fill="${color}" />
                <rect x="18" y="26" width="4" height="4" fill="${color}" />
                <rect x="8" y="16" width="2" height="2" fill="#ff0" />
                <rect x="22" y="16" width="2" height="2" fill="#ff0" />
                <path d="M12 20 L20 20 L16 24 Z" fill="#000" />
            `,
            ghost: `
                <rect x="8" y="4" width="16" height="20" fill="#fff" opacity="0.6"/>
                <rect x="10" y="2" width="12" height="24" fill="#fff" opacity="0.8"/>
                <rect x="6" y="10" width="20" height="10" fill="#fff" opacity="0.4"/>
                <rect x="10" y="10" width="3" height="5" fill="#000" />
                <rect x="19" y="10" width="3" height="5" fill="#000" />
                <rect x="10" y="24" width="4" height="4" fill="#fff" opacity="0.5"/>
                <rect x="18" y="24" width="4" height="4" fill="#fff" opacity="0.5"/>
            `,
            dragon: `
                <rect x="4" y="14" width="24" height="10" fill="${color}" />
                <rect x="8" y="6" width="16" height="10" fill="${color}" />
                <rect x="2" y="10" width="6" height="6" fill="${color}" />
                <rect x="24" y="10" width="6" height="6" fill="${color}" />
                <rect x="10" y="24" width="4" height="6" fill="${color}" />
                <rect x="18" y="24" width="4" height="6" fill="${color}" />
                <rect x="10" y="10" width="2" height="2" fill="#f00" />
                <rect x="20" y="10" width="2" height="2" fill="#f00" />
                <path d="M12 4 L14 8 L10 8 Z" fill="#666" />
                <path d="M18 4 L20 8 L16 8 Z" fill="#666" />
            `,
            knight: `
                <rect x="10" y="12" width="12" height="16" fill="#777" />
                <rect x="8" y="4" width="16" height="10" fill="#bbb" />
                <rect x="6" y="14" width="4" height="10" fill="#777" />
                <rect x="22" y="14" width="4" height="10" fill="#777" />
                <rect x="10" y="10" width="12" height="2" fill="#000" />
                <rect x="12" y="6" width="3" height="3" fill="#000" />
                <rect x="17" y="6" width="3" height="3" fill="#000" />
                <rect x="24" y="6" width="2" height="18" fill="#aaa" />
                <rect x="23" y="24" width="4" height="2" fill="#884400" />
            `,
            serpent: `
                <path d="M8 28 Q 16 20 24 28" fill="none" stroke="${color}" stroke-width="4" />
                <path d="M8 20 Q 16 12 24 20" fill="none" stroke="${color}" stroke-width="4" />
                <rect x="12" y="4" width="8" height="12" fill="${color}" />
                <rect x="13" y="8" width="2" height="2" fill="#fff" />
                <rect x="17" y="8" width="2" height="2" fill="#fff" />
                <rect x="11" y="2" width="10" height="2" fill="${color}" opacity="0.5"/>
            `
        };

        return svgStart + (sprites[shape] || sprites.slime) + svgEnd;
    }
};
