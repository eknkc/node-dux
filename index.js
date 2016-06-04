import Immutable from 'seamless-immutable'

export { Immutable };

export function createAction(name, mapper = x => x, metaMapper = x => x) {
  var symbol = Symbol(name);

  var action = function(payload, meta) {
    return {
      type: symbol,
      payload: mapper(payload),
      meta: metaMapper(meta)
    }
  }

  action.type = symbol;

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

export function createReducer(defState, reducers = {}, combine, filter) {
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
