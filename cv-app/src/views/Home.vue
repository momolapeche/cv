<template>
  <div class="wrapper">
    <div class="picture-and-name">
      <img src="https://www.rainforest-alliance.org/wp-content/uploads/2021/06/three-toed-sloth-teaser-1.jpg.optimal.jpg">
      <div>
        Raphaël Menegaux
      </div>
    </div>

    <div class="content-wrapper">
      <div class="presentation">
        <div class="presentation-element first">
          <div class="presentation-title">études</div>
          <div class="presentation-content">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
          </div>
        </div>
        <div class="presentation-element">
          <div class="presentation-title">expérience puro</div>
          <div class="presentation-content">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
          </div>
        </div>
        <div class="presentation-element">
          <div class="presentation-title">attentes</div>
          <div class="presentation-content">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Laboriosam amet quod placeat nam veritatis quibusdam, praesentium distinctio id, vel iure quae saepe. Similique molestiae quis nostrum at dolor nihil laborum!
          </div>
        </div>
      </div>

      <div class="projects">
        <!-- <div>
          Projects
        </div> -->
        <div class="projects-carrousel">
          <div v-for="i in 3" v-bind:key="i" v-bind:style="`--index: ${i}`" class="project-thumbnail">
            <img src="https://m.media-amazon.com/images/I/61BfHKDqZuL._AC_SY606_.jpg" alt="">
            <div>
              THE NEVER ENDING REVOLUTION ({{i}})
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>

.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.picture-and-name {
  text-align: left;
  display: flex;
  flex-direction: row;
  margin-bottom: 5rem;
  align-items: center;
}
.picture-and-name img {
  border-radius: 40%;
  border: 0.5rem solid rgb(40, 28, 28);
  width: 10em;
}
.picture-and-name div {
  font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 3em;
  font-weight: 700;
}

.content-wrapper {
  display: flex;
  flex-direction: row;
  align-items: start;
}

.presentation {
  /* width: 90%; */
  width: 40em;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 10em;
}

.presentation-element.first {
  margin-top: 0;
}
.presentation-element {
  margin-top: 2em;
}

.presentation-title {
  font-size:xx-large;
  font-weight: 700;
}

.presentation-content {
  margin-left: 3em;
}

.projects {
  /* width: 30%; */
  height: auto;
  /* overflow: hidden; */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.projects-carrousel {
  /* background-color: antiquewhite; */
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
}
.project-thumbnail {
  background-color: aquamarine;
  width: 10rem;
  border-radius: 5%;
  overflow: hidden;
}
.project-thumbnail img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  object-position: 0 0;
}

</style>

<script lang="ts">
import { defineComponent } from 'vue';
// import HelloWorld from '@/components/HelloWorld.vue'; // @ is an alias to /src


export default defineComponent({
  name: 'Home',
  components: {
    // HelloWorld,
  },
});
</script>
