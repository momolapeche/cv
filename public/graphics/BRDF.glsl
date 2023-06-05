vec3 THREE_F_Schlick(const in vec3 f0, const in float f90, const in float u) {
    float fresnel = exp2((-5.55473 * u - 6.98316 ) * u);
    return f0 * (1.0 - fresnel) + (f90 * fresnel);
}

float THREE_V_GGX_SmithCorrelated(const in float NdotL, const in float NdotV, const in float alpha) {
    float a2 = alpha * alpha;

    float gv = NdotL * sqrt(a2 + (1.0 - a2) * NdotV * NdotV);
    float gl = NdotV * sqrt(a2 + (1.0 - a2) * NdotL * NdotL);

    return 0.5 / max(gv + gl, EPSILON);
}

float THREE_D_GGX(const in float NdotH, const in float alpha) {
    float a2 = alpha * alpha;

    float denom = NdotH*NdotH * (a2 - 1.0) + 1.0;

    return INV_PI * a2 / (denom * denom);
}

vec3 THREE_BRDF_GGX(float VdotH, float NdotL, float NdotV, float NdotH, vec3 f0, float f90, float roughness) {
    float alpha = roughness * roughness;

    vec3 F = THREE_F_Schlick(f0, f90, VdotH);
    float V = THREE_V_GGX_SmithCorrelated(NdotL, NdotV, alpha);
    float D = THREE_D_GGX(NdotH, alpha);

    return F * (V * D);
}

vec3 BRDF_Lambert(const in vec3 c) {
    return c * INV_PI;
}

vec3 ThreeShading(const in vec3 V, const in vec3 L, const in vec3 N, const in vec3 albedo, const in float roughness, const in float metalness, const in vec3 lightColor) {
    vec3 H = normalize(L + V);

    float LdotH = saturate(dot(L, H));
    float NdotH = saturate(dot(N, H));
    float NdotL = saturate(dot(N, L));
    float NdotV = saturate(dot(N, V));
    float VdotH = saturate(dot(V, H));

    vec3 diffuseColor = albedo * (1.0 - metalness);

    vec3 dxy = max( abs( dFdx(N) ), abs( dFdy(N) ) );
    float geometryRoughness = max(max(dxy.x, dxy.y), dxy.z);

    float matRoughness = max(roughness, 0.0525);// 0.0525 corresponds to the base mip of a 256 cubemap.
    matRoughness += geometryRoughness;
    matRoughness = min(matRoughness, 1.0);

	vec3 specularColor = mix( vec3( 0.04 ), albedo, metalness);
	float specularF90 = 1.0;

    vec3 irradiance = NdotL * lightColor;

    vec3 f = THREE_BRDF_GGX(VdotH, NdotL, NdotV, NdotH, specularColor, specularF90, matRoughness);

    return irradiance * (BRDF_Lambert(diffuseColor) + f);
}
