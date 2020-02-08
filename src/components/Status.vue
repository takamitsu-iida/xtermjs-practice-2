<template>
  <div id="Status">
    <!-- status -->
    <div id="error_message" v-if="error_message">{{ error_message }}</div>

    <!-- table -->
    <table>
      <thead v-pre>
        <tr>
          <th class="user_room">room</th>
          <th class="user_name">name</th>
          <th class="button"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in roomUsers"
          v-bind:key="user.userid">
          <td>{{ user.room }}</td>
          <td>{{ user.name }}</td>
          <td class="button">
            <button v-on:click.stop.prevent.shift.exact="onButton(user)">?</button>
          </td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
import io from "socket.io-client";

// ./components
import generateUuid from './uuid.js';
import props from './props'

const WEBSOCKET_URL = props.WEBSOCKET_URL;

function createSocket(vm) {

  // connect backend websocket
  const socket = io.connect(WEBSOCKET_URL, {
    // transports: ['websocket'],
    // allowUpgrades: false,
    pingTimeout: 30000
  });

  socket.on("connect", function() {
    vm.error_message = "";
  });

  socket.on("disconnect", function(err) {
    vm.error_message = "WEBSOCKET DISCONNECTED: " + err;
    // socket.io.reconnection(true);
  });

  socket.on("error", function(err) {
    vm.error_message = "ERROR: " + err;
  });

  socket.on("roomUsers", function(roomUsers) {
    console.log(roomUsers);
    vm.roomUsers = roomUsers;
  });

  return socket;
}

export default {
  name: "Status",
  data: function() {
    return {
      roomUsers: [],
      userid: null,
      error_message: "WEBSOCKET DISCONNECTED"
    }
  },
  mounted: function() {
    this.socket = createSocket(this);
    this.userid = generateUuid();
    this.socket.emit("join", {room: "control", name: window.navigator.userAgent, userid: this.userid});
  },
  beforeDestroy: function() {
    this.socket.close();
  },
  methods: {
    onButton: function(user) {
      console.log(user);
      document.activeElement.blur();
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

#Status {
  max-width: 640px;
  margin: 5px auto 5px 5px;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead th {
  border-bottom: 2px solid #0099e4;
  color: #0099e4;
}

th {
  padding: 0 8px;
  line-height: 30px;
}

thead th.user_room {
  width: 150px;
}
thead th.user_name {
  width: auto;
}
thead th.button {
  width: 50px;
  text-align: right;
}

tbody td.button {
  text-align: right;
}

tbody tr th,
tbody tr td {
  border-bottom: 1px solid #ccc;
  transition: all 0.4s;
  padding: 5px;
}

tbody tr:hover th,
tbody tr:hover td {
  background: #f4fbff;
}

button {
  border: none;
  border-radius: 20px;
  line-height: 24px;
  padding: 0 8px;
  background: #0099e4;
  color: #fff;
  cursor: pointer;
}

.users {
  width: 100%;
  height: 200px;
  margin-bottom: 10px;
  overflow: auto;
  display: grid;
  grid-template-rows: 1fr;
}

#error_message {
  background-color: red;
  color: white;
}
</style>
