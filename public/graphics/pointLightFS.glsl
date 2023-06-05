precision highp float;

uniform sampler2D uAlbedo;
uniform sampler2D uPosition;
uniform sampler2D uNormal;
uniform sampler2D uRoughnessMetalness;

uniform vec3 uEye;

uniform vec3 uLightPosition;

layout(location = 0) out vec4 oLight;

#define PI 3.1415926535
#define INV_PI 0.31830988618
#define saturate(x) clamp(x, 1e-5, 1.0)

struct Material {
    vec3 albedo;
    float smoothness;
    float metalness;
    float reflectance;
};


vec3 F_Schlick(in vec3 f0, in float f90, in float u) {
    return f0 + (f90 - f0) * pow(1.0 - u, 5.0);
}

float Fr_DisneyDiffuse(in float NdotV, in float NdotL, in float LdotH, in float linearRoughness) {
    float energyBias = mix(0.0, 0.5, linearRoughness);
    float energyFactor = mix(1.0, 1.0 / 1.51, linearRoughness);
    float fd90 = energyBias + 2.0 * LdotH*LdotH * linearRoughness;
    vec3 f0 = vec3(1);
    float lightScatter = F_Schlick(f0, fd90, NdotL).r;
    float viewScatter  = F_Schlick(f0, fd90, NdotV).r;

    return lightScatter * viewScatter * energyFactor;
}

float V_SmithGGXCorrelated(in float NdotL, in float NdotV, in float alphaG) {
    // Original formulation of G_SmithGGX Correlated
    // lambda_v = (-1 + sqrt (alphaG2 * (1 - NdotL2) / NdotL2 + 1)) * 0.5;
    // lambda_l = (-1 + sqrt (alphaG2 * (1 - NdotV2) / NdotV2 + 1)) * 0.5;
    // G_ SmithGGXCorrelated = 1 / (1 + lambda_v + lambda_l);
    // V_ SmithGGXCorrelated = G_SmithGGXCorrelated / (4.0 f * NdotL * NdotV);

    float alphaG2 = alphaG * alphaG;

    float Lambda_GGXV = NdotL * sqrt((-NdotV * alphaG2 + NdotV) * NdotV + alphaG2);
    float Lambda_GGXL = NdotV * sqrt((-NdotL * alphaG2 + NdotL) * NdotL + alphaG2);

    return 0.5 / (Lambda_GGXV + Lambda_GGXL);
}

// NDF
// a² / (PI * ((n.h)² * (a² - 1) + 1)²)
float D_GGX(in float NdotH, in float a) {
    float a2 = a*a;
    float f = (NdotH * a2 - NdotH) * NdotH + 1.0;
    return a2 / (f * f * PI);
}

float G_GGX_Schlick_Sub(float dt, float k) {
    return dt * (1.0 - k) + k;
}
float G_GGX_Schlick(float NdotV, float NdotL, float a) {
    float k = (a+1.0);
    k = k*k / 8.0;
    return G_GGX_Schlick_Sub(NdotV, k) * G_GGX_Schlick_Sub(NdotL, k);
}

// vec3 F_Schlick(in vec3 f0, in float f90, in float u) {
vec3 Cook_Torrance(float NdotH, float NdotV, float NdotL, vec3 albedo, float roughness, float metalness) {
    vec3 f0 = vec3(0.04);
    f0 = mix(f0, albedo, metalness);
    float D = D_GGX(NdotH, roughness);
    vec3 F = F_Schlick(f0, 1.0, NdotH);
    float G = G_GGX_Schlick(NdotV, NdotL, roughness);

    return vec3(D * F * G / max(0.5, 4.0 * NdotV * NdotL));
}

vec3 BRDF_Lambert(vec3 albedo) {
    return albedo * INV_PI;
}



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





void main() {
    vec3 albedo = texelFetch(uAlbedo, ivec2(gl_FragCoord.xy), 0).rgb;
    vec3 position = texelFetch(uPosition, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 normal = texelFetch(uNormal, ivec2(gl_FragCoord.xy), 0).xyz;

    float lightRadius = 40.;

    vec3 unormalizedLightVector = uLightPosition - position;
    vec3 L = normalize(unormalizedLightVector);
    vec3 N = normalize(normal);
    vec3 V = normalize(uEye - position);

    vec3 H = normalize(L + V);
    float LdotH = saturate(dot(L, H));
    float NdotH = saturate(dot(N, H));
    float NdotL = saturate(dot(N, L));
    float NdotV = saturate(dot(N, V));

    // float NdotV = abs(dot(N, V)) + 1e-5;
    // float Fd = Fr_DisneyDiffuse(NdotV, NdotL, LdotH, 0.9) / PI;

    vec3 I = vec3(3);

    float att = 1.0;
    // att *= getDistanceAtt(unormalizedLightVector, 1. / (lightRadius * lightRadius));


// float G_GGX_Schlick(float NdotV, float NdotL, float a) {
// vec3 F_Schlick(in vec3 f0, in float f90, in float u) {


    vec3 lightColor = vec3(1);
    vec3 H_NL = normalize(N + L);
    float NdotH_NL = saturate(dot(N, H_NL));
    // vec3 color = Fd * NdotL * albedo * lightColor * att;
    // vec3 color = I * att * NdotL * (BRDF_Lambert(albedo)*0.0 + Cook_Torrance(NdotH_NL, NdotV, NdotL, 1.));
    vec2 roughnessMetalness = texelFetch(uRoughnessMetalness, ivec2(gl_FragCoord.xy), 0).rg;
    float roughness = roughnessMetalness.r;
    float metalness = roughnessMetalness.g;
    vec3 color = I * att * NdotL * (BRDF_Lambert(albedo) + Cook_Torrance(NdotH, NdotV, NdotL, albedo, roughness, metalness));
    // vec3 color = vec3(D_GGX(NdotH, roughness));
    // vec3 color = vec3(G_GGX_Schlick(NdotV, NdotL, roughness));
    // vec3 color = vec3(F_Schlick(mix(vec3(0.04), vec3(1), 0.), 1.0, saturate(dot(V, N))));
    oLight = vec4(color, 1);
}



