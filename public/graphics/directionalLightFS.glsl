precision highp float;

uniform sampler2D uAlbedo;
uniform sampler2D uPosition;
uniform sampler2D uNormal;
uniform sampler2D uRoughnessMetalness;

uniform vec3 uEye;

uniform vec3 uLightDir;

layout(location = 0) out vec4 oLight;

#define EPSILON 1e-5
#define PI 3.1415926535
#define INV_PI 0.31830988618
#define saturate(x) clamp(x, 1e-5, 1.0)

struct Material {
    vec3 albedo;
    float smoothness;
    float metalness;
    float reflectance;
};


/********** ATT **********/
float smoothDistanceAtt(float squaredDistance, float invSqrAttRadius) {
    float factor = squaredDistance * invSqrAttRadius;
    float smoothFactor = saturate(1.0 - factor*factor);
    return smoothFactor * smoothFactor;
}

float getDistanceAtt(vec3 unormalizedLightVector, float invSqrAttRadius) {
    float sqrDist = dot(unormalizedLightVector, unormalizedLightVector);
    float attenuation = 1.0 / max(sqrDist, 0.01*0.01);
    attenuation *= smoothDistanceAtt(sqrDist, invSqrAttRadius);

    return attenuation;
}

float getAngleAtt(vec3 normalizedLightVector, vec3 lightDir, float lightAngleScale, float lightAngleOffset) {
    // On the CPU
    // float lightAngleScale = 1.0 / max (0.001 , (cosInner - cosOuter));
    // float lightAngleOffset = -cosOuter * angleScale;

    float cd = dot(lightDir, normalizedLightVector);
    float attenuation = saturate(cd * lightAngleScale + lightAngleOffset);
    // smooth the transition
    attenuation *= attenuation;

    return attenuation;
}

#include <BRDF>

void main() {
    vec3 albedo = texelFetch(uAlbedo, ivec2(gl_FragCoord.xy), 0).rgb;
    vec3 position = texelFetch(uPosition, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 normal = texelFetch(uNormal, ivec2(gl_FragCoord.xy), 0).xyz;

    if (normal == vec3(0.)) {
        discard;
    }

    vec3 L = normalize(uLightDir);
    vec3 N = normal;
    vec3 V = normalize(uEye - position);
    vec3 H = normalize(L + V);

    float LdotH = saturate(dot(L, H));
    float NdotH = saturate(dot(N, H));
    float NdotL = saturate(dot(N, L));
    float NdotV = saturate(dot(N, V));
    float VdotH = saturate(dot(V, H));

    vec2 roughnessMetalness = texelFetch(uRoughnessMetalness, ivec2(gl_FragCoord.xy), 0).rg;
    float roughness = roughnessMetalness.r;
    float metalness = roughnessMetalness.g;


    vec3 lightColor = vec3(1) * PI;

    vec3 color;
    // color = Frostbite(V, L, N, albedo, roughness, metalness, lightColor);
    color = ThreeShading(V, L, N, albedo, roughness, metalness, lightColor);

    oLight = vec4(color, 1);
}










