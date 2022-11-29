<template>
  <div class="wrapper">
    <div class="picture-and-name">
      <img src="https://www.rainforest-alliance.org/wp-content/uploads/2021/06/three-toed-sloth-teaser-1.jpg.optimal.jpg">
      <div>
        Raphaël Menegaux
      </div>
    </div>
    <div class="presentation">
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fugiat natus asperiores repudiandae temporibus! Officiis, numquam. Doloremque, distinctio facilis dignissimos iure blanditiis libero maxime ut quaerat minima! Doloremque asperiores maiores minus.
    </div>
    <div class="projects">
      <div>
        Projects
      </div>
      <div class="projects-carrousel">
        <div v-for="i in 10" v-bind:key="i" v-bind:style="`--index: ${i}`" class="project-thumbnail">
          <img src="https://m.media-amazon.com/images/I/61BfHKDqZuL._AC_SY606_.jpg" alt="">
          <div>
            THE NEVER ENDING REVOLUTION ({{i}})
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

.picture-and-name img {
  border-radius: 40%;
  border: 1rem solid rgb(40, 28, 28);
  width: 25%;
}
.picture-and-name div {
  font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 7ch;
  font-weight: 700;
}

.picture-and-name {
  margin-bottom: 5rem;
}

.presentation {
  width: 70%;
  text-align: left;
}

.projects {
  margin-top: 5rem;
  width: 100%;
  height: auto;
  /* overflow: hidden; */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.projects-carrousel {
  background-color: antiquewhite;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.project-thumbnail {
  background-color: aquamarine;
  width: 15rem;
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
