class EvaluationContext {
  constructor() {
    this.outer = x => x;
    this.current = x => x;
  }
}

export function step(defs, expr) {
  const ectx = stepImpl(defs, expr, new EvaluationContext());
  return ectx.outer(ectx.current(null));
}

function isValue(expr) {
  return expr.type === undefined || expr.type === 'lambda-expr';
}

function stepImpl(defs, expr, ectx) {
  if (!expr.type) {
    throw new Error('not implemented yet.');
  } else {
    switch (expr.type) {
      case 'function-application':
        switch (expr.f) {
          case 'reset':
            return stepReset(defs, expr.args[0].body, ectx);
          default:
            return apply(defs, expr.f, expr.args, ectx);
        }
      default:
        throw new Error('not implemented yet.');
    }
  }
}

function stepReset(defs, expr, ectx) {
  if (isValue(expr)) {
    ectx.current = _ => expr;
    return ectx;
  } else {
    return ectx;
  }
}

function apply(defs, f, args, ectx) {
  const argTable = new Map();
  for (let i = 0; i < f.params.length; i++) {
    argTable.set(f.params[i], args[i]);
  }
  const substituted = substitute(argTable, f.body);
  ectx.current = _ => substituted;
  return ectx;
}

function substitute(argTable, expr) {
  const x = argTable.get(expr);
  if (x) {
    return x;
  }
  throw new Error('not implemented yet. expr=' + expr + ', argTable=' + mapToStr(argTable));
}

function mapToStr(m) {
  return '{' + [...m.entries()].map(([k, v]) => k + ':' + v).join(', ') + '}';
}
