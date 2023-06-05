precision highp float;

uniform float uMetalness;
uniform float uRoughness;
uniform vec3 uAlbedo;

in vec3 vPosition;
in vec3 vNormal;

layout(location = 0) out vec4 oAlbedo;
layout(location = 1) out vec4 oPosition;
layout(location = 2) out vec4 oNormal;
layout(location = 3) out vec4 oRoughnessMetalness;

void main() {
    vec3 normal = normalize(vNormal);

    oAlbedo = vec4(uAlbedo, 1);
    oPosition = vec4(vPosition, 1);
    oNormal = vec4(normal, 1);
    oRoughnessMetalness = vec4(uRoughness, uMetalness, 0, 1);
}
