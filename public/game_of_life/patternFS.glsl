#version 300 es

precision highp float;

uniform sampler2D uTexture;
uniform ivec2 uOrigin;

out vec4 oColor;

void main() {
    ivec2 coords = ivec2(gl_FragCoord.xy);
    int texel = texelFetch(uTexture, coords - uOrigin, 0).r > 0. ? 1 : 0;
    oColor = vec4(texel, 0, 0, 1);
}