#version 300 es

precision highp float;

uniform sampler2D uPrevState;

out vec4 oColor;

void main() {
    ivec2 coords = ivec2(gl_FragCoord.xy);

    int neighborCount = 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 0,-1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 0, 1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 1, 0), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2(-1, 0), 0).r > 0. ? 1 : 0;

    neighborCount += texelFetch(uPrevState, coords + ivec2(-1,-1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 1,-1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2(-1, 1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 1, 1), 0).r > 0. ? 1 : 0;

    int cellState = texelFetch(uPrevState, coords, 0).r > 0. ? 1 : 0;

    int nextState = 0;

    if (cellState == 0 && neighborCount == 3) {
        nextState = 1;
    }
    else if (cellState == 1 && (neighborCount == 2 || neighborCount == 3)) {
        nextState = 1;
    }

    oColor = vec4(nextState, 0, 0, 1);
}