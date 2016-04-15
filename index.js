import Immutable from 'seamless-immutable'

export { Immutable };

export function createAction(name, mapper = x => x) {
  var symbol = Symbol(name);

  var action = function(...data) {
    return {
      type: symbol,
      payload: mapper(...data)
    }
  }

  action.type = symbol;

  return action;
}

export function createReducer(defState, reducers) {
  return function(state = defState, action) {
    if (!Immutable.isImmutable(state))
      state = Immutable(state);

    if (action && action.type && reducers[action.type]) {
      state = reducers[action.type](state, action);

      if (!Immutable.isImmutable(state))
        throw new TypeError('Reducers must return Immutable objects.');
    }

    return state;
  }
}

export function combineReducers(reducers) {
  return function(state = Immutable({}), action) {
    Object.keys(reducers).forEach(rkey => {
      let oldState = state.get(rkey);
      let newState = reducers[rkey](oldState, action);

      if (typeof newState === 'undefined')
        throw new Error("Received undefined as new state.")

      if (oldState !== newState)
        state = state.set(rkey, newState);
    })

    return state;
  }
}
