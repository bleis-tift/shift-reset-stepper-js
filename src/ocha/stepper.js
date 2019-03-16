import * as ast from './ast-utils.js'
import * as printer from './printer.js'

let id = 0;
function gensym() {
  return "v" + id++;
}

class EvaluationContext {
  constructor() {
    this.outer = x => x;
    this.current = x => x;
  }
  clone() {
    const cloned = new EvaluationContext();
    cloned.outer = this.outer;
    cloned.current = this.current;
    return cloned;
  }
}

export function step(defs, expr) {
  id = 0;
  const ectx = stepImpl(defs, expr, new EvaluationContext());
  const res = ectx.outer(ectx.current(null));
  return res;
}

function isValue(expr) {
  return expr.type === undefined || expr.type === 'lambda-expr';
}

function isOpOrLambda(f) {
  switch (f) {
    case '+':
    case '-':
    case '*':
    case '/':
      return true;
    default:
      return f.type === 'lambda-expr';
  }
}

function stepImpl(defs, expr, ectx) {
  if (!expr.type) {
    ectx.current = _ => expr;
    return ectx;
  } else {
    switch (expr.type) {
      case 'function-application':
        switch (expr.f) {
          case 'reset': {
            const next = nextStepArgPos(expr.args);
            if (next === -1 || next === 0) {
              return stepReset(defs, expr.args[0].body, expr.args.slice(1), ectx);
            } else {
              const prev = ectx.current;
              ectx.current = hole => {
                const newArgs = expr.args.map(x => x);
                newArgs[next] = hole;
                return prev(ast.funApp(expr.f, newArgs));
              };
              return stepImpl(defs, expr.args[next], ectx);
            }
          }
          case 'shift':
            return stepShift(defs, expr.args[0], ectx);
          default: {
            const next = nextStepArgPos(expr.args);
            if (next === -1) {
              if (isOpOrLambda(expr.f)) {
                return apply(defs, expr.f, expr.args, ectx);
              } else if (expr.f.type === 'function-application') {
                const newEctx = stepImpl(defs, expr.f, ectx.clone());
                ectx.current = hole => ast.funApp(newEctx.outer(newEctx.current(hole)), expr.args);
                return ectx;
              } else {
                return expand(defs, expr.f, expr.args, ectx);
              }
            } else {
              const prev = ectx.current;
              ectx.current = hole => {
                const newArgs = expr.args.map(x => x);
                newArgs[next] = hole;
                return prev(ast.funApp(expr.f, newArgs));
              };
              return stepImpl(defs, expr.args[next], ectx);
            }
          }
        }
      case 'lambda-expr':
        ectx.current = _ => expr;
        return ectx;
      default:
        throw new Error('not implemented yet.');
    }
  }
}

function nextStepArgPos(args) {
  for (let i = args.length - 1; i >= 0; i--) {
    if (!isValue(args[i])) return i;
  }
  return -1;
}

function stepReset(defs, expr, args, ectx) {
  if (isValue(expr)) {
    const newExpr = ectx.current(expr);
    switch (newExpr.type) {
      case 'lambda-expr':
        if (args.length !== 0)
          ectx.current = _ => ast.funApp(newExpr, args);
        else
          ectx.current = _ => newExpr;
        return ectx;
      default:
        ectx.current = _ => newExpr;
        return ectx;
    }
  } else {
    const oldEctx = ectx.clone();
    const newEctx = stepImpl(defs, expr, new EvaluationContext());
    ectx.current = hole => newEctx.outer(newEctx.current(hole));
    ectx.outer = hole => oldEctx.outer(oldEctx.current(ast.funApp('reset', [ast.lambdaExpr([ast.astUnit()], hole), ...args])));
    return ectx;
  }
}

function stepShift(defs, expr, ectx) {
  const v = gensym();
  const newExpr = ast.funApp(expr, [ast.lambdaExpr([v], ast.funApp('reset', [ast.lambdaExpr([ast.astUnit()], ectx.current(v))]))]);
  ectx.current = _ => newExpr;
  return ectx;
}

function apply(defs, f, args, ectx) {
  switch (f) {
    case '+': {
      const newExpr = ectx.current(args[0] + args[1]);
      ectx.current = _ => newExpr;
      return ectx;
    }
    case '-': {
      const newExpr = ectx.current(args[0] - args[1]);
      ectx.current = _ => newExpr;
      return ectx;
    }
    case '*': {
      const newExpr = ectx.current(args[0] * args[1]);
      ectx.current = _ => newExpr;
      return ectx;
    }
    case '/': {
      const newExpr = ectx.current(args[0] / args[1]);
      ectx.current = _ => newExpr;
      return ectx;
    }
    default:
      if (f.params.length == 1) {
        const substituted = substitute(f.body, f.params[0], args[0]);
        const newExpr = ectx.current(substituted);
        if (args.length != 1)
          ectx.current = _ => ast.funApp(newExpr, args.slice(1));
        else
          ectx.current = _ => newExpr;
        return ectx;
      } else {
        const [p1, ...pRest] = f.params;
        const [a1, ...aRest] = args;
        const newLambda = ast.lambdaExpr([p1], ast.funApp(ast.lambdaExpr(pRest, f.body), aRest));
        return apply(defs, newLambda, [a1], ectx);
      }
  }
}

function expand(defs, f, args, ectx) {
  const varTable = new Map();
  for (const d of defs) {
    varTable.set(d.ident, d);
  }
  const def = varTable.get(f);
  const syms = def.params.map(p => p);
  for (let i = 0; i < syms.length; i++) {
    varTable.set(def.params[i], syms[i]);
  }
  const newExpr = ectx.current(ast.funApp(ast.lambdaExpr(syms, def.body), args));
  ectx.current = _ => newExpr;
  return ectx;
}

function isComputed(expr) {
  return typeof expr === 'number' && Number.isFinite(expr);
}

function substitute(body, ident, arg) {
  const varTable = new Map([[ident, arg]]);
  return substituteImpl(varTable, body);
}

function substituteImpl(varTable, expr) {
  if (isComputed(expr)) {
    return expr;
  }
  const v = varTable.get(expr);
  if (v !== undefined) {
    return v;
  }
  if (!expr.type) {
    return expr;
  }
  switch (expr.type) {
    case 'function-application': {
      const newArgs = expr.args.map(a => substituteImpl(cloneMap(varTable), a));
      const newF = substituteImpl(cloneMap(varTable), expr.f);
      return ast.funApp(newF, newArgs);
    }
    case 'lambda-expr': {
      const newVarTable = cloneMap(varTable);
      for (const p of expr.params) {
        newVarTable.delete(p);
      }
      const newBody = substituteImpl(newVarTable, expr.body);
      return ast.lambdaExpr(expr.params, newBody);
    }
  }
  throw new Error('not implemented yet. expr=' + printer.printExpr(expr) + ', varTable=' + mapToStr(varTable));
}

function cloneMap(m) {
  return new Map([...m.entries()]);
}

function mapToStr(m) {
  return '{' + [...m.entries()].map(([k, v]) => k + ':' + JSON.stringify(v)).join(', ') + '}';
}
