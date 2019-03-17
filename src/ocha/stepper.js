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

  setCurrent(newExpr) {
    this.current = _ => newExpr;
    return this;
  }
}

export function step(defs, expr) {
  id = 0;
  const ec = stepImpl(defs, expr, new EvaluationContext());
  const res = ec.outer(ec.current(null));
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

function stepImpl(defs, expr, ec) {
  if (!expr.type) {
    ec.current = _ => expr;
    return ec;
  } else {
    switch (expr.type) {
      case 'function-application':
        switch (expr.f) {
          case 'reset': {
            const next = nextStepArgPos(expr.args);
            if (next === -1 || next === 0) {
              return stepReset(defs, expr.args[0].body, expr.args.slice(1), ec);
            } else {
              const prev = ec.current;
              ec.current = hole => {
                const newArgs = expr.args.map(x => x);
                newArgs[next] = hole;
                return prev(ast.funApp(expr.f, newArgs));
              };
              return stepImpl(defs, expr.args[next], ec);
            }
          }
          case 'shift':
            return stepShift(defs, expr.args[0], ec);
          default: {
            const next = nextStepArgPos(expr.args);
            if (next === -1) {
              if (isOpOrLambda(expr.f)) {
                return apply(defs, expr.f, expr.args, ec);
              } else if (expr.f.type === 'function-application') {
                const newec = stepImpl(defs, expr.f, ec.clone());
                ec.current = hole => ast.funApp(newec.outer(newec.current(hole)), expr.args);
                return ec;
              } else {
                return expand(defs, expr.f, expr.args, ec);
              }
            } else {
              const prev = ec.current;
              ec.current = hole => {
                const newArgs = expr.args.map(x => x);
                newArgs[next] = hole;
                return prev(ast.funApp(expr.f, newArgs));
              };
              return stepImpl(defs, expr.args[next], ec);
            }
          }
        }
      case 'lambda-expr':
        ec.current = _ => expr;
        return ec;
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

function stepReset(defs, expr, args, ec) {
  if (isValue(expr)) {
    const newExpr = ec.current(expr);
    switch (newExpr.type) {
      case 'lambda-expr':
        if (args.length !== 0)
          return ec.setCurrent(ast.funApp(newExpr, args));
        else
          return ec.setCurrent(newExpr);
      default:
        return ec.setCurrent(newExpr);
    }
  } else {
    const oldEc = ec.clone();
    const newEc = stepImpl(defs, expr, new EvaluationContext());
    ec.current = hole => newEc.outer(newEc.current(hole));
    ec.outer = hole => oldEc.outer(oldEc.current(ast.reset(hole, args)));
    return ec;
  }
}

function stepShift(defs, expr, ec) {
  const v = gensym();
  return ec.setCurrent(ast.funApp(expr, [ast.lambdaExpr([v], ast.reset(ec.current(v)))]));
}

function apply(defs, f, args, ec) {
  switch (f) {
    case '+': return ec.setCurrent(ec.current(args[0] + args[1]));
    case '-': return ec.setCurrent(ec.current(args[0] - args[1]));
    case '*': return ec.setCurrent(ec.current(args[0] * args[1]));
    case '/': return ec.setCurrent(ec.current(args[0] / args[1]));
    default:
      if (f.params.length == 1) {
        const substituted = substitute(f.body, f.params[0], args[0]);
        if (args.length != 1)
          return ec.setCurrent(ast.funApp(ec.current(substituted), args.slice(1)));
        else
          return ec.setCurrent(ec.current(substituted));
      } else {
        const [p1, ...pRest] = f.params;
        const [a1, ...aRest] = args;
        const newLambda = ast.lambdaExpr([p1], ast.funApp(ast.lambdaExpr(pRest, f.body), aRest));
        return apply(defs, newLambda, [a1], ec);
      }
  }
}

function expand(defs, f, args, ec) {
  const varTable = new Map();
  for (const d of defs) {
    varTable.set(d.ident, d);
  }
  const def = varTable.get(f);
  const syms = def.params.map(p => p);
  for (let i = 0; i < syms.length; i++) {
    varTable.set(def.params[i], syms[i]);
  }
  return ec.setCurrent(ec.current(ast.funApp(ast.lambdaExpr(syms, def.body), args)));
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
