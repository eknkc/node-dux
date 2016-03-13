import Immutable from 'immutable'

export { Immutable };

export function M(...args) { return new Immutable.Map(...args) }
export function L(...args) { return new Immutable.List(...args) }
export function S(...args) { return new Immutable.Set(...args) }

export function createAction(name) {
  var symbol = Symbol(name);

  var action = function(...data) {
    return {
      type: symbol,
      payload: data.length > 1 ? Object.assign({}, ...data) : data[0]
    }
  }

  action.type = symbol;

  return action;
}

export function createReducer(defState, reducers) {
  return function(state = defState, action) {
    if (!Immutable.Iterable.isIterable(state))
      state = Immutable.fromJS(state);

    if (action && action.type && reducers[action.type]) {
      state = reducers[action.type](state, action);

      if (!Immutable.Iterable.isIterable(state))
        throw new TypeError('Reducers must return Immutable objects.');
    }

    return state;
  }
}

export function combineReducers(reducers) {
  return function(state = new Immutable.Map(), action) {
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
