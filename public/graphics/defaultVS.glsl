precision highp float;

uniform mat4 uM;
uniform mat3 uMNormal;
uniform mat4 uVP;

#define POSITION_LOCATION 0

in vec3 aPosition;
in vec3 aNormal;

#define JOINTS_NUM_MAX 128

#ifdef USE_SKIN

    in uvec4 aJoints;
    in vec4 aWeights;

    uniform mat4 uJoints[JOINTS_NUM_MAX];

#endif

out vec3 vPosition;
out vec3 vNormal;

void main() {
    vec3 normal = aNormal;
    vec4 position = vec4(aPosition, 1);

#ifdef USE_SKIN
    mat4 t =
        uJoints[aJoints.x] * aWeights.x +
        uJoints[aJoints.y] * aWeights.y +
        uJoints[aJoints.z] * aWeights.z +
        uJoints[aJoints.w] * aWeights.w;

    position = t * position;
    normal = normalize(mat3(t) * normal);
#endif

    position = uM * position;
    normal = uMNormal * normal;

    vPosition = position.xyz;
    vNormal = normal;
    gl_Position = uVP * position;
}
