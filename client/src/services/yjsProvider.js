import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";

export class YjsSocketProvider {
  constructor(roomId, socket, options = {}) {
    this.roomId = roomId;
    this.socket = socket;
    this.doc = new Y.Doc();
    this.monacoBinding = null;
    this.destroyed = false;

    this.yCode = this.doc.getText("code");
    this.yCanvasArray = this.doc.getArray("canvasElements");
    this.yNotes = this.doc.getText("specNotes");
    this.yMeta = this.doc.getMap("metadata");

    this._onLocalUpdate = this._onLocalUpdate.bind(this);
    this._onRemoteUpdate = this._onRemoteUpdate.bind(this);
    this._onYjsInit = this._onYjsInit.bind(this);

    this.init();
  }

  init() {
    if (!this.socket || !this.roomId) return;

    // Listen to local document updates and transmit over Socket.IO
    this.doc.on("update", this._onLocalUpdate);

    // Listen to remote updates from peers via socket
    this.socket.on("yjs:update", this._onRemoteUpdate);
    this.socket.on("yjs:init", this._onYjsInit);

    // Request initial document state from server
    this.socket.emit("yjs:request-init", { roomId: this.roomId });
  }

  _onLocalUpdate(update, origin) {
    if (this.destroyed || origin === "remote") return;

    try {
      const updateArray = Array.from(update);
      this.socket.emit("yjs:update", {
        roomId: this.roomId,
        update: updateArray,
      });
    } catch (err) {
      console.error("Yjs local update emit error:", err);
    }
  }

  _onRemoteUpdate(data) {
    if (this.destroyed || !data?.update || data.roomId !== this.roomId) return;
    try {
      const updateUint8 = new Uint8Array(data.update);
      Y.applyUpdate(this.doc, updateUint8, "remote");
    } catch (err) {
      console.error("Yjs remote update apply error:", err);
    }
  }

  _onYjsInit(data) {
    if (this.destroyed || !data?.docState || data.roomId !== this.roomId) return;
    try {
      const stateUint8 = new Uint8Array(data.docState);
      Y.applyUpdate(this.doc, stateUint8, "remote");
    } catch (err) {
      console.error("Yjs init document state error:", err);
    }
  }

  bindMonaco(editor, monaco) {
    if (!editor || this.destroyed) return;

    if (this.monacoBinding) {
      try {
        this.monacoBinding.destroy();
      } catch (err) {
        // Safe idempotent cleanup
      }
      this.monacoBinding = null;
    }

    try {
      const model = editor.getModel();
      if (model && typeof model.isDisposed === "function" && !model.isDisposed()) {
        this.monacoBinding = new MonacoBinding(
          this.yCode,
          model,
          new Set([editor]),
          undefined
        );
      }
    } catch (err) {
      console.error("Monaco Yjs Binding error:", err);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.monacoBinding) {
      try {
        this.monacoBinding.destroy();
      } catch (e) {}
      this.monacoBinding = null;
    }

    if (this.doc) {
      try {
        this.doc.off("update", this._onLocalUpdate);
        this.doc.destroy();
      } catch (e) {}
    }

    if (this.socket) {
      try {
        this.socket.off("yjs:update", this._onRemoteUpdate);
        this.socket.off("yjs:init", this._onYjsInit);
      } catch (e) {}
    }
  }
}
