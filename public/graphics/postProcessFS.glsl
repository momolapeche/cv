precision highp float;

uniform sampler2D uTexture;

out vec4 oColor;

void main() {
    oColor = texelFetch(uTexture, ivec2(gl_FragCoord.xy), 0);
}
