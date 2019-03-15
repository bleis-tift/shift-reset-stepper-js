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
  return expr.type === undefined;
}

function stepImpl(defs, expr, ectx) {
  switch (expr.type) {
    case 'function-application':
      switch (expr.f) {
        case 'reset':
          return stepReset(defs, expr.args[0].body, ectx);
      }
  }
  return ectx;
}

function stepReset(defs, expr, ectx) {
  if (isValue(expr)) {
    ectx.current = _ => expr;
    return ectx;
  } else {
    return ectx;
  }
}
