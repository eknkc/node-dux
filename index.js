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
  if (typeof actions === 'function')
    return bindAction(actions, dispatch, meta)

  if (typeof actions !== 'object' || actions === null)
    throw new Error("Action creators must be a function.")

  var keys = Object.keys(actions)
  var bound = {}
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (key === 'default') continue;
    var action = actions[key]
    if (typeof action === 'function') {
      bound[key] = bindAction(action, dispatch, meta)
    } else if (typeof action === 'object') {
      bound[key] = bindActions(action, dispatch, meta)
    }
  }
  return bound
}

const scopedAction = createAction("scopedAction");

export function scopeReducer(scope, reducer) {
  return (state, action) => {
    if (action.type === scopedAction.type && action.meta.scope === scope)
      action = action.payload

    return reducer(state, action);
  }
}

export function scopeAction(scope, action) {
  function wrapResult(result) {
    if (typeof result === 'function')
      return (dispatch, getState) => result(action => dispatch(wrapResult(action)), getState)

    if (typeof result.then === 'function')
      return result.then(r => wrapResult(r));

    return scopedAction(result, {
      scope,
      logTransform: () => Object.assign({}, result, { type: `[${scope}] ${String(result.type)}` })
    });
  }

  return (payload, meta) => wrapResult(action(payload, meta));
}

export function scopeActions(scope, actions) {
  if (typeof actions === 'function')
    return scopeAction(scope, actions)

  if (typeof actions !== 'object' || actions === null)
    throw new Error("Action creators must be a function.")

  var keys = Object.keys(actions)
  var scoped = {}
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (key === 'default') continue;
    var action = actions[key]
    if (typeof action === 'function') {
      scoped[key] = scopeAction(scope, action)
    } else if (typeof action === 'object') {
      scoped[key] = scopeActions(scope, action)
    }
  }
  return scoped
}
