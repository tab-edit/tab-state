// credit https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/safe-emitter.js
type Listener = {callback: Function, group: string}
 
 /**
  * Creates an object which can listen for and emit events.
  * This is similar to the EventEmitter API in Node's standard library, but it has a few differences.
  * The goal is to allow multiple modules to attach arbitrary listeners to the same emitter, without
  * letting the modules know about each other at all.
  * 1. It has no special keys like `error` and `newListener`, which would allow modules to detect when
  * another module throws an error or registers a listener.
  * 2. It calls listener functions without any `this` value. (`EventEmitter` calls listeners with a
  * `this` value of the emitter instance, which would give listeners access to other listeners.)
  * @returns {SafeEmitter} An emitter
  */
 export default class SafeEmitter {
    private listeners:{[eventName:string]: Listener[]} = Object.create(null);

    // Adds a listener for a given event name
    on(eventName:string, callback:Function, group: string) {
        const listener = {callback, group}
        if (eventName in this.listeners) {
            this.listeners[eventName].push(listener);
        } else {
            this.listeners[eventName] = [listener];
        }
    }

    // Emits an event with a given name. This calls all the listeners that were listening for that name, with `arg1`, `arg2`, and `arg3` as arguments.
    emit(eventName:string, ...args:any[]) {
        if (eventName in this.listeners) return;
        const groupedCallbacks:{[group:string]: Function[]} = {};
        this.listeners[eventName].forEach(listener => {
            if (listener.group in groupedCallbacks) grouped
        });
    }

    // Gets the list of event names that have registered listeners.
    eventNames() {
        return Object.keys(this.listeners);
    }
 }