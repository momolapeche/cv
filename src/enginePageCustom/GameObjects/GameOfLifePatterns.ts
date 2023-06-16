interface PatternFrame {
    width: number
    height: number
    data: number[]
}

interface Pattern {
    period: number
    frames: PatternFrame[]
}

export const patterns: Record<string, Pattern> = {
    clignotant: {
        period: 2,
        frames: [
            { width: 3, height: 1, data: [1,1,1] },
        ]
    },
    glider: {
        period: 4,
        frames: [
            { width: 3, height: 3, data: [
                0, 1, 0,
                0, 0, 1,
                1, 1, 1,
            ] }
        ]
    },
    puffer: {
        period: 2,
        frames: [
            { width: 5, height: 4, data: [
                0, 1, 1, 1, 1,
                1, 0, 0, 0, 1,
                0, 0, 0, 0, 1,
                1, 0, 0, 1, 0,
            ] }
        ]
    },
    block: {
        period: 1,
        frames: [{ width: 2, height: 2, data: [1,1,1,1,] }],
    },
    tube: {
        period: 1,
        frames: [{ width: 3, height: 3, data: [
            0,1,0,
            1,0,1,
            0,1,0,
        ] }],
    },
    boat: {
        period: 1,
        frames: [{ width: 3, height: 3, data: [
            1,1,0,
            1,0,1,
            0,1,0,
        ] }],
    },
    pulsar: {
        period: 1,
        frames: [{
            width: 9, height: 3, data: [
                1,1,1,0,0,0,1,1,1,
                1,0,1,0,0,0,1,0,1,
                1,1,1,0,0,0,1,1,1,
            ]
        }]
    }
}
