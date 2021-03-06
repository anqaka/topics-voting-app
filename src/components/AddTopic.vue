<template>
  <section class="form-section col-xs-12 col-md-8">
    <h2>
      Add your topic proposition
    </h2>
    <loader v-if="loading" class="loader--overlay" />
    <form
      v-if="submitStatus !== 'OK'"
      @submit.prevent="addTopic"
    >
      <div :class="['input', { 'input--error': $v.title.$error }]">
        <label for="title">
          Topic title
        </label>
        <input
          id="title"
          v-model.trim="$v.title.$model"
          class="input__field"
          type="text"
          placeholder="Topic title"
          maxlength="150"
        >
        <div
          v-if="!$v.title.required"
          class="error"
        >
          Field is required
        </div>
      </div>
      <div :class="['input', { 'input--error': $v.description.$error }]">
        <label for="description" class="form__label">
          Topic description (markdown syntax available, max. 700 characteres)
        </label>
        <textarea
          id="description"
          @input="debounceInput"
          v-model="$v.description.$model"
          class="input__field input__field--textarea"
          type="text"
          placeholder="Topic description"
          maxlength="700"
        />
        <span>
          {{ charactersLeft }}
        </span>
        <div
          v-if="!$v.description.required"
          class="error"
        >
          Field is required
        </div>
        <div
          v-if="!$v.description.maxLength"
          class="error"
        >
          Max length of text description - 700 characteres
        </div>
      </div>
      <div class="form-section__action">
        <v-button
          :type="'submit'"
        >
          Add Topic
        </v-button>
      </div>
    </form>
    <div v-if="submitStatus === 'OK'">
      <p>
        Thanks for your submission! Your topic will be verified.
        <br>
        it will show on the list as soon as it is approved.
      </p>
      <br>
      <v-button
        @btn-event="submitStatus = null"
      >
        Add another topic
      </v-button>
    </div>
    <p
      v-if="submitStatus === 'ERROR'"
      class="submit-error"
    >
      Please fill the form correctly.
    </p>
    <div
      v-if="description"
      class="form-section__preview"
    >
      <h3>Your description preview:</h3>
      <div v-html="compiledMarkdown(description)"></div>
    </div>
  </section>
</template>
<script>
import { mapGetters } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'
import debounce from 'lodash.debounce'
import markdown from '@/mixins/markdown.js'
import Loader from '@/components/Loader.vue'
import VButton from '@/components/Button.vue'

export default {
  components: {
    Loader,
    VButton
  },
  computed: {
    ...mapGetters({
      isLoggedIn: 'isLoggedIn'
    }),
    charactersLeft () {
      const char = this.description.length
      const limit = 700

      return `${(limit - char)} / ${limit} left`
    }
  },
  data () {
    return {
      title: '',
      description: '',
      loading: false,
      submitStatus: null
    }
  },
  mixins: [
    validationMixin,
    markdown
  ],
  validations: {
    title: {
      required
    },
    description: {
      required
    }
  },
  methods: {
    debounceInput () {
      debounce(function (e) {
        this.input = e.target.value
      }, 300)
    },
    addTopic () {
      this.$v.$touch()
      if (this.$v.$invalid) {
        this.submitStatus = 'ERROR'
      } else {
        this.loading = true
        this.submitStatus = 'PENDING'
        this.$store.dispatch('addTopic', {
          title: this.title,
          description: this.description
        }).then(() => {
          this.$v.$reset()
          this.loading = false
          this.title = ''
          this.description = ''
          this.submitStatus = 'OK'
        })
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.submit-error {
  color: $error;
}
</style>
