function getState(key= undefined, defaultValue = undefined){
  if(this.__state__ === undefined){
    this.__state__ = {};
  };
  if(key !== undefined){
    if(this.__state__[key] === undefined){
      this.__state__[key] = defaultValue;
    }
  };
  return this.__state__;
}

function listenState(stateKey, callback){
  if(typeof this.getStateEmitter !== typeof (() => {})){
    throw new Error(`klass ${this.constructor} must implement .getStateEmitter before being allowed to call listenState`);
  }
  const eventKey = `STATE_UPDATE.${stateKey}`;
  this.getStateEmitter().on(eventKey, callback);
}

function removeStateListener(stateKey, callback){
  if(typeof this.getStateEmitter !== typeof (() => {})){
    throw new Error(`klass ${this.constructor} must implement .getStateEmitter before being allowed to call listenState`);
  }
  const eventKey = `STATE_UPDATE.${stateKey}`;
  this.getStateEmitter().removeListener(eventKey, callback);
}

function listenStateOnce(stateKey, callback){
  if(typeof this.getStateEmitter !== typeof (() => {})){
    throw new Error(`klass ${this.constructor} must implement .getStateEmitter before being allowed to call listenState`);
  }
  const eventKey = `STATE_UPDATE.${stateKey}`;
  this.getStateEmitter().once(eventKey, callback);
}

function tryEmit(stateKey, before, after){
  if(this.getStateEmitter === undefined){
    return;
  }
  const eventKey = `STATE_UPDATE.${stateKey}`;
  if(typeof this.getStateEmitter === typeof (() => {})){
    this.getStateEmitter().emit(eventKey, before, after);
  }
}

function setState(updateState){
  this.state = this.getState();
  for(let key of Object.keys(updateState)){
    let stateValue = updateState[key];
    let currentState = this.state[key];
    this.state[key] = stateValue;
    this.tryEmit(key, currentState, stateValue);
  };
}

const prototypes = {
  setState,
  getState,
  listenState,
  tryEmit,
}

function extend(klass){
  return intercept(klass);
}

function intercept(klass){
  for(let key of Object.keys(prototypes)){
    klass.prototype[key] = prototypes[key];
  }
}

function staticIntercept(klass){
  klass.__state__ = {};
  for(let key of Object.keys(prototypes)){
    klass[key] = prototypes[key];
  }
}

function staticExtend(klass){
  return staticIntercept(klass);
}

module.exports = { extend, staticExtend, staticIntercept, intercept };
