export default {
  // this should be null if http server runs socket.io
  WEBSOCKET_URL: "http://localhost:8888/",
  xterm: {
    cursorBlink: true,
    cursorStyle: "block",
    bellStyle: "none",
    enableBold: true,
    fontFamily: "courier-new, courier, monospace",
    fontSize: 13,
    scrollback: 1000,
    theme: {
      background: "#fdf6e3",
      foreground: "black",
      cursor: "black"
    }
  }
};
