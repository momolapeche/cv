<template>
    <div class="about">
        <!-- <canvas id="CCanvas"></canvas> -->
        <canvas id="ECanvas"></canvas>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { AppEngine } from '@/enginePageCustom/app';

export default defineComponent({
    async mounted() {
        new AppEngine()
    }
})
</script>
