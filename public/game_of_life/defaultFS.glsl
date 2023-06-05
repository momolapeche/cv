#version 300 es

precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uPatternTexture;
uniform ivec2 uPatternOrigin;

in vec2 vPosition;

out vec4 oColor;

void main() {
    ivec2 texSize = textureSize(uTexture, 0);

    ivec2 cellCoords = clamp(ivec2((vPosition + 1.) / 2. * vec2(texSize)), ivec2(0), texSize);

    ivec2 patternTextureSize = textureSize(uPatternTexture, 0);

    vec3 color = vec3(0);
    if (
        cellCoords.x >= uPatternOrigin.x && cellCoords.y >= uPatternOrigin.y &&
        cellCoords.x < uPatternOrigin.x + patternTextureSize.x &&
        cellCoords.y < uPatternOrigin.y + patternTextureSize.y
    ) {
        color = texelFetch(uPatternTexture, cellCoords - uPatternOrigin, 0).r > 0. ? vec3(0,1,0) : vec3(0);
    }
    int cellState = texture(uTexture, vPosition * .5 + .5).r > 0. ? 1 : 0;
    color.r = cellState == 0 ? 0. : 1.;
    oColor = vec4(color, 1);
}