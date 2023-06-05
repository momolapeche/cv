#version 300 es

precision highp float;

uniform mat3 uTransform;

in vec2 aPosition;

out vec2 vPosition;

void main() {
    vPosition = aPosition;
    gl_Position = vec4((uTransform * vec3(aPosition, 1)).xy, 0, 1);
}