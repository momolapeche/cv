#version 300 es

precision highp float;

uniform sampler2D uTexture;
uniform float uScale;

in vec2 vPosition;

out vec4 oColor;

void main() {
    vec3 color = texelFetch(uTexture, ivec2(gl_FragCoord.xy), 0).rgb / uScale;
    oColor = vec4(color, 1);
}