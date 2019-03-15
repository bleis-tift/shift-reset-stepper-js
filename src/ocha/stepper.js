import * as ast from './ast-utils.js'
import * as printer from './printer.js'

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
          case 'reset':
            return stepReset(defs, expr.args[0].body, ectx);
          default:
            const next = nextStepArgPos(expr.args);
            if (next === -1) {
              if (isOpOrLambda(expr.f)) {
                return apply(defs, expr.f, expr.args, ectx);
              } else {
                return expand(defs, expr.f, expr.args, ectx);
              }
            } else {
              ectx.current = hole => {
                const newArgs = expr.args.map(x => x);
                newArgs[next] = hole;
                return ast.funApp(expr.f, newArgs);
              };
              return stepImpl(defs, expr.args[next], ectx);
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

function stepReset(defs, expr, ectx) {
  if (isValue(expr)) {
    ectx.current = _ => expr;
    return ectx;
  } else {
    return ectx;
  }
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

let id = 0;
function gensym() {
  return "v" + id++;
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
