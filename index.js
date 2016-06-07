import Immutable from 'seamless-immutable'

export { Immutable };

const IDENTITY = x => x;

export function createAction(name, { map = IDENTITY, mapMeta = IDENTITY } = {}) {
  let symbol = Symbol(name);

  let action = function(payload, meta) {
    return {
      type: symbol,
      payload: map(payload),
      meta: mapMeta(meta)
    }
  }

  action.type = symbol;

  return action;
}

export function createThunk(name, func, { mapState = IDENTITY } = {}) {
  let subAction = createAction(name);

  let action = function(payload, meta) {
    let inner = func(payload, meta);

    if (typeof inner === 'function') {
      return function (dispatch, getState) {
        dispatch(subAction());
        return inner(dispatch, (root = false) => root ? getState() : mapState(getState()))
      }
    }

    return inner;
  }

  action.type = subAction.type;

  return action;
}

export function createActions(options, ...names) {
  if (typeof options === 'string') {
    names = [options, ...names];
    options = {}
  }

  options.prefix = options.prefix || "";

  return names.reduce((actions, name) => Object.assign(actions, { [name]: createAction(options.prefix + ":" + name) }), {});
}

export function createReducer(defState, reducers = {}, { combine, filter } = {}) {
  if (combine)
    combine = combineReducers(combine);

  return function(state = defState, action) {
    if (filter && !filter(action))
      return state;

    if (!Immutable.isImmutable(state))
      state = Immutable(state);

    if (action && action.type && reducers[action.type]) {
      state = reducers[action.type](state, action);

      if (!Immutable.isImmutable(state))
        state = Immutable(state);
    }

    if (combine)
      state = combine(state, action);

    return state;
  }
}

export function combineReducers(reducers) {
  return function(state = Immutable({}), action) {
    Object.keys(reducers).forEach(rkey => {
      let oldState = state[rkey];
      let newState = reducers[rkey](oldState, action);

      if (typeof newState === 'undefined')
        throw new Error("Received undefined as new state.")

      if (oldState !== newState)
        state = state.set(rkey, newState);
    })

    return state;
  }
}

function getter(path) {
  return function(obj) {
    for (var i = 0; i < path.length; i++) {
      if (typeof obj === 'undefined' || obj === null) return obj;
      obj = obj[path[i]]
    }

    return obj;
  }
}

class Factory {
  constructor(path, options = {}) {
    this.path = path;
    this.options = options;
    this.map = getter(path);
  }

  action(name, opt = {}) {
    return createAction([...this.path, name].join(':'), Object.assign({}, this.options, opt))
  }

  thunk(name, func, opt = {}) {
    return createThunk([...this.path, name].join(':'), func, Object.assign({ mapState: this.map }, this.options, opt))
  }

  reducer(defState, reducers, options) {
    return createReducer(defState, reducers, options);
  }
}

export function factory(path, options) {
  return new Factory(path, options)
}

export function bindAction(action, dispatch, meta = {}) {
  return (payload, ameta = {}) => dispatch(action(payload, Object.assign({}, meta, ameta)));
}

export function bindActions(actions, dispatch, meta) {
  return wrapActions(actions, bindAction, dispatch, meta);
}

function wrapActions(actions, wrapper, ...args) {
  if (typeof actions === 'function')
    return wrapper(actions, ...args)

  if (typeof actions !== 'object' || actions === null)
    throw new Error("Action creators must be a function.")

  return Object.keys(actions).reduce((memo, key) => {
    if (key === 'default')
      return memo;

    let action = actions[key];

    if (typeof action === 'function')
      memo[key] = wrapper(action, ...args)
    else if (typeof action === 'object')
      memo[key] = wrapActions(action, wrapper, ...args)

    return memo;
  }, {});
}
