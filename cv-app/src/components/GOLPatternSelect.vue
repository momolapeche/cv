<template>
    <select @change="onChange">
        <option v-for="pattern in patterns" :key="pattern" :value="pattern">{{ pattern }}</option>
    </select>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

export default defineComponent({
    setup() {
        //
    },
    methods: {
        onChange(e: Event) {
            this.$emit("patternChanged", (e.target as HTMLSelectElement).value)
        }
    },
    props: {
        patterns: {
            type: Array as PropType<Array<string>>,
            required: true,
        },
    },
    emits: [ "patternChanged" ]
})
</script>
