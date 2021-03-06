import { firebaseAction } from 'vuexfire'
import { auth, topicRef, userRef } from '../db'
import { checkSocialLogin } from '../helpers'

export default {
  bindTopics: firebaseAction(({ bindFirebaseRef, commit }) => {
    return bindFirebaseRef('topics', topicRef)
      .then(() => {
        commit('LOAD_TOPICS', 1)
      })
      .catch((err) => {
        commit('LOAD_TOPICS', 2)
        commit('notification/push', {
          message: err.message,
          title: 'Error',
          type: 'error'
        }, { root: true })
      })
  }),
  bindUser: firebaseAction(({ bindFirebaseRef, state, commit }) => {
    return bindFirebaseRef(
      'userVotes',
      userRef.child(state.user.id).child('votes')
    ).catch((err) => {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    })
  }),
  addTopic: firebaseAction(({ state, commit }, topic) => {
    return topicRef.push({
      title: topic.title,
      description: topic.description,
      votes: 0,
      authorId: state.user.id,
      authorEmail: state.user.email,
      authorName: state.user.displayName,
      createDate: new Date(Date.now()).toLocaleString(),
      approved: false
    }).then(() => {
      commit('notification/push', {
        message: 'Your proposition was added to verification',
        title: 'Success',
        type: 'success'
      }, { root: true })
    }).catch((err) => {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    })
  }),
  async onAuthStateChanged ({ state, commit, dispatch }) {
    try {
      await auth.onAuthStateChanged((user) => {
        if (!user) {
          commit('RESET_USER_DATA')
          commit('RESET_VOTES_DATA')
          return
        }
        const provider = user.providerData[0].providerId
        if (user.emailVerified || checkSocialLogin(provider)) {
          commit('SET_AUTH_USER', { user })
          dispatch('checkAdmin')
          dispatch('bindUser')
          commit('notification/push', {
            message: 'You have logged in successfully',
            title: 'Success',
            type: 'success'
          }, { root: true })
        } else {
          commit('SET_AUTH_USER', { user })
          // check if initMail was sent
          dispatch('checkinitEmailSent').then(() => {
            if (!state.user.initEmailSent) {
              dispatch('sendEmailVerification')
            }
          })
        }
      })
    } catch (err) {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    }
  },
  upvote: firebaseAction(({ state, dispatch, commit }, data) => {
    return userRef.child(state.user.id).child('votes').push({
      [data.id]: true
    }).then(() => {
      data.votes++
      dispatch('updateVotes', { id: data.id, votes: data.votes })
    }).catch((err) => {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    })
  }),
  downvote: firebaseAction(({ state, dispatch, commit }, data) => {
    return userRef.child(state.user.id)
      .child('votes')
      .child(data.itemKey)
      .remove()
      .then(() => {
        data.votes--
        dispatch('updateVotes', { id: data.id, votes: data.votes })
      }).catch((err) => {
        commit('notification/push', {
          message: err.message,
          title: 'Error',
          type: 'error'
        }, { root: true })
      })
  }),
  updateVotes: firebaseAction(({ commit, dispatch }, data) => {
    return topicRef.child(data.id).update({
      votes: data.votes
    }).then(() => {
      dispatch('bindUser')
    }).catch((err) => {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    })
  }),
  approveTopic: firebaseAction(({ commit }, data) => {
    return topicRef.child(data).update({
      approved: true
    }).catch((err) => {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    })
  }),
  async checkAdmin ({ commit, state }) {
    try {
      await userRef
        .child(state.user.id)
        .once('value', snapshot => {
          if (snapshot.exists()) {
            const snap = snapshot.val()
            if (snap.admin) {
              commit('SET_ADMIN')
            }
          }
        })
    } catch (err) {
      console.log(err)
    }
  },
  async checkinitEmailSent ({ commit, state }) {
    try {
      await userRef
        .child(state.user.id)
        .once('value', snapshot => {
          if (snapshot.exists()) {
            const snap = snapshot.val()
            if (snap.initEmailSent) {
              commit('INIT_EMAIL_SENT')
            }
          }
        })
    } catch (err) {
      console.log(err)
    }
  },
  sendEmailVerification ({ state, dispatch, commit }) {
    const user = auth.currentUser
    if (!state.user.initEmailSent) {
      dispatch('setInitEmailSent')
    }
    user.sendEmailVerification().then(() => {
      // set in db that init email was send if needed
      if (!state.user.initEmailSent) {
        dispatch('setInitEmailSent')
      }
      commit('notification/push', {
        message: `An Email verification request was sent to ${user.email}`,
        title: '',
        type: 'info'
      }, { root: true })
    }).catch((err) => {
      commit('notification/push', {
        message: err.message,
        title: 'Error',
        type: 'error'
      }, { root: true })
    })
  },
  setInitEmailSent: firebaseAction(({ state, commit }) => {
    return userRef.child(state.user.id).set({
      initEmailSent: true
    }).then(() => {
      commit('INIT_EMAIL_SENT')
    })
  }),
  setLinkingAccount ({ commit }, payload) {
    commit('SET_LINK_ACCOUNT', payload)
  }
}
