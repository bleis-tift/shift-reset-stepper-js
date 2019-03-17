export function astUnit() {
  return 'ast-unit';
}

export function astWildcard() {
  return 'ast-wildcard';
}

export function funDef(name, params, body) {
  return {
    type: 'function-definition',
    ident: name,
    params: params,
    body: body,
  };
}

export function lambdaExpr(params, body) {
  return {
    type: 'lambda-expr',
    params: params,
    body: body,
  };
}

export function funApp(f, args) {
  return {
    type: 'function-application',
    f: f,
    args: args,
  };
}

export function reset(body, args) {
  if (!args) {
    args = [];
  }
  return funApp('reset', [lambdaExpr([astUnit()], body), ...args]);
}

export function shift(kName, body) {
  return funApp('shift', [lambdaExpr([kName], body)]);
}
