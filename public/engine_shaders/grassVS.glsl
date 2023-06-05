uniform float time;
uniform float radius;

#include <common>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

in vec3 worldPosition;
in vec3 bladeNormal;

out float vHeight;

void main() {
	#include <color_vertex>

    vHeight = position.y;

    vec3 shiverDir = normalize(vec3(1));
    float shiverStrength = cos(time*3.0 + dot(worldPosition, shiverDir)) * 0.2;
    vec3 shiver = shiverDir * shiverStrength;
    float bladeLength = (rand(worldPosition.xz) * 0.5 + 0.5) * 0.5 * sqrt(bladeNormal.y);

    vec3 pos = position * bladeLength;

    if (position.y > 0.0) {
        pos = normalize(bladeNormal + position + shiver) * bladeLength;
    }

    vec3 transformed = worldPosition + pos;

	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}
