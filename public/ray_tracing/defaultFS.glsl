#version 300 es

precision highp float;

struct Material {
    vec3 color;
    float reflectivity;
    vec3 emission;
    float specularity;
};

struct Sphere {
    vec3 position;
    float radius;

    int material;
};

struct Triangle {
    vec3 v0;
    vec3 v1;
    vec3 v2;

    int material;
};


in vec2 vPosition;

uniform uint uSeed;

#define SPHERES_NUM_MAX 20
#define TRIANGLES_NUM_MAX 20
#define MATERIALS_NUM_MAX 20

#define SCREEN_X 512
#define SCREEN_Y 512

#define SPHERE_TYPE 0
#define TRIANGLE_TYPE 1

layout(std140) uniform UBObjects {
    Material[MATERIALS_NUM_MAX] materials;

    int trianglesNum;
    Triangle[TRIANGLES_NUM_MAX] triangles;
    int spheresNum;
    Sphere[SPHERES_NUM_MAX]     spheres;
} uObjects;

out vec4 oColor;

#define PI 3.141592
/*
function gaussian() {
    const theta = 2 * Math.PI * Math.random()
    const rho = Math.sqrt(-2 * Math.log(1 - Math.random()))
    return [
        rho * Math.cos(theta),
        rho * Math.sin(theta),
    ]
}
*/
//////////////////// Random dir on cone
        // for (let i = 0; i < 100; i++) {
        //     const v = Math.random() * 2 - 1
        //     const theta = Math.random() * 2 * Math.PI
        //     const s = Math.sqrt(1 - v*v)
        //     const x = s * Math.cos(theta)
        //     const y = s * Math.sin(theta)
        //     const z = v

        //     const len = Math.sqrt(x*x+y*y+z*z)
        //     console.log(len)
        // }

float rand(inout uint state) {
    state = state * 747796405u + 2891336453u;
    uint result = ((state >> ((state >> 28) + 4u)) ^ state) * 277803737u;
    result = (result >> 22) ^ result;
    return float(result) / 4294967295.0;
}

float randNormal(inout uint state) {
    float theta = 2. * PI * rand(state);
    float rho = sqrt(-2. * log(rand(state)));
    return rho * cos(theta);
}

vec3 randomUniformHemisphere(inout uint state) {
    float x = randNormal(state);
    float y = randNormal(state);
    float z = randNormal(state);

    return normalize(vec3(x, y, abs(z)));
}

// float gaussian(inout uint state) {
//     float theta = 2.0 * PI * rand(state);
//     float rho = sqrt(-2.0*log(1.0 - rand(state)));
//     return rho - cos(theta);
// }

// vec3 randomPointOnSphere(inout uint state) {
//     return normalize(vec3(
//         gaussian(state),
//         gaussian(state),
//         gaussian(state)
//     ));
// }

vec3 randomDirection(inout uint state, in float angle) {
    float v = cos(angle) + rand(state)*(1. - cos(angle));
    float theta = rand(state) * 2. * PI;
    float s = sqrt(1. - v*v);

    return vec3(
        s * cos(theta),
        s * sin(theta),
        v
    );
}
// vec3 randomDirectionHemisphere(inout uint state) {
//     float v = rand(state);
//     float theta = rand(state) * 2. * PI;
//     float s = sqrt(1. - v*v);

//     return vec3(
//         s * cos(theta),
//         s * sin(theta),
//         v
//     );
// }
/////////// COSINE WEIGHTED
// vec3 randomDirectionHemisphere(inout uint state) {
//     float theta = acos(sqrt(rand(state)));
//     float phi = rand(state) * 2. * PI;
//     float s = sin(theta);

//     return vec3(
//         s * cos(phi),
//         s * sin(phi),
//         cos(theta)
//     );
// }
/////////// BLINN PHONG
vec3 randomDirectionHemisphere(inout uint state) {
    float alpha = 0.5;
    float theta = acos(pow(rand(state), 1. / (alpha + 2.)));
    float phi = rand(state) * 2. * PI;
    float s = sin(theta);

    return vec3(
        s * cos(phi),
        s * sin(phi),
        cos(theta)
    );
}

vec3 applyQuat(in vec3 v, in vec4 q) {
    vec3 uv = cross(q.xyz, v);
    vec3 uuv = cross(q.xyz, uv);
    uv = uv * 2. * q.w;
    uuv = uuv * 2.;
    return v + uv + uuv;
}

vec4 rotationBetweenVecs(in vec3 u, in vec3 v) {
    return normalize(vec4(cross(u, v), 1. + dot(u, v)));
}

vec4 slerp(in vec4 u, in vec4 v, in float t) {
    vec4 a = u;
    vec4 b = v;
    float cosom = dot(a, b);
    if (cosom < 0.0) {
        cosom = -cosom;
        b = -b;
    }
    float omega = acos(cosom);
    float sinom = sin(omega);
    float scale0 = sin((1.0 - t) * omega) / sinom;
    float scale1 = sin(t * omega) / sinom;

    return scale0 * a + scale1 * b;
}


struct Ray {
    vec3 origin;
    vec3 direction;
};

struct ObjectId {
    int type;
    int index;
};




bool raySphereIntersect(in Ray ray, in Sphere sphere, inout float t) {
    float radius = sphere.radius;

    vec3 o = ray.origin - sphere.position;

    float a = 2. * dot(ray.direction, ray.direction);
    float b = 2. * dot(o, ray.direction);
    float c = dot(o, o) - radius*radius;

    float disc = b*b - 2.0*a*c;

    if (disc >= 0.) {
        disc = sqrt(disc);
        float t0 = (-b + disc) / a;
        float t1 = (-b - disc) / a;

        t = min(t0, t1);
        return t > 0.;
    }
    else {
        return false;
    }
}

bool rayTriangleIntersect(in Ray ray, in Triangle triangle, inout float t) {
    float EPSILON = 0.000001;
    vec3 v0 = triangle.v0;
    vec3 v1 = triangle.v1;
    vec3 v2 = triangle.v2;

    vec3 edge1 = v1 - v0;
    vec3 edge2 = v2 - v0;

    vec3 h = cross(ray.direction, edge2);
    float a = dot(edge1, h);
    if (a > -EPSILON && a < EPSILON)
        return false;

    float f = 1.0 / a;
    vec3 s = ray.origin - v0;
    float u = f * dot(s, h);
    if (u < 0.0 || u > 1.0)
        return false;

    vec3 q = cross(s, edge1);
    float v = f * dot(ray.direction, q);
    if (v < 0.0 || u + v > 1.0)
        return false;
    
    t = f * dot(edge2, q);
    if (t > EPSILON) {
        return true;
    }
    else
        return false;
}

struct RayCastInfo {
    ObjectId id;
    float dist;
    vec3 point;
    vec3 normal;
    int material;
};

void rayCast(in Ray ray, in ObjectId ignored, out RayCastInfo info) {
    float minDist = 1000000.;
    ObjectId id = ObjectId(-1, -1);
    vec3 normal = vec3(0);
    int material;
    vec3 point;

    float t = 0.;
    for (int i = 0; i < SPHERES_NUM_MAX; i++) {
        if (i >= uObjects.spheresNum)
            break;
        if (ObjectId(SPHERE_TYPE, i) == ignored)
            continue;
        if (raySphereIntersect(ray, uObjects.spheres[i], t) && t < minDist) {
            minDist = t;
            point = ray.origin + t * ray.direction;
            normal = (point - uObjects.spheres[i].position) / uObjects.spheres[i].radius;
            material = uObjects.spheres[i].material;
            id = ObjectId(SPHERE_TYPE, i);
        }
    }
    for (int i = 0; i < TRIANGLES_NUM_MAX; i++) {
        if (i >= uObjects.trianglesNum)
            break;
        if (ObjectId(TRIANGLE_TYPE, i) == ignored)
            continue;
        Triangle tri = uObjects.triangles[i];
        if (rayTriangleIntersect(ray, tri, t) && t < minDist) {
            minDist = t;
            point = ray.origin + t * ray.direction;
            normal = cross(tri.v1 - tri.v0, tri.v2 - tri.v0);
            material = tri.material;
            id = ObjectId(TRIANGLE_TYPE, i);
        }
    }

    info.dist = minDist;
    info.normal = normal;
    info.material = material;
    info.point = point;
    info.id = id;
}

struct IntersectionInfo {
    vec3 point;
    vec3 normal;
    float cosine;
    int material;
};

#define NUM_RAYS 4

void main() {
    vec3 color = vec3(0,0,0);

    ivec2 tmp = ivec2(gl_FragCoord);
    uint state = uint((tmp.x*4000231 + tmp.y*123) ^ (tmp.x * tmp.y)) + uSeed;

    Ray ray = Ray(vec3(0.002,0.001,0), normalize(
        vec3(vPosition, -1) + vec3(
            (rand(state) - 0.5) * 1. / float(SCREEN_X),
            (rand(state) - 0.5) * 1. / float(SCREEN_Y),
            0
        )
    ));

    IntersectionInfo[NUM_RAYS] hits;
    int numHits = 0;

    float strength = 1.0;
    ObjectId lastHit = ObjectId(-1, -1);

    for (int i = 0; i < NUM_RAYS; i++) {
        RayCastInfo hit;
        rayCast(ray, lastHit, hit);

        hits[numHits] = IntersectionInfo(hit.point, hit.normal, 1.0, hit.material);

        if (hit.id != ObjectId(-1, -1)) {
            vec3 normal = hit.normal;

            ray.origin = hit.point;
            vec4 diffuseRot = rotationBetweenVecs(vec3(0,0,1), normal);

            ray.direction = applyQuat(randomDirectionHemisphere(state), diffuseRot);

            hits[numHits].cosine = dot(normal, ray.direction);

            lastHit = hit.id;

            numHits++;

            if (dot(ray.direction, normal) <= 0.) {
                break;
            }
        }
        else {
            break;
        }
    }


    vec3 lightColor = vec3(0);
    if (numHits > 0) {
        lightColor = uObjects.materials[hits[numHits - 1].material].emission;
    }
    for (int i = 1; i < NUM_RAYS; i++) {
        if (i >= numHits)
            break;
        
        IntersectionInfo info = hits[numHits - i - 1];
        lightColor = lightColor*uObjects.materials[info.material].color*info.cosine + uObjects.materials[info.material].emission;
    }

    color = clamp(lightColor, 0., 1.);

    oColor = vec4(color, 1);
}
