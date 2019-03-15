import * as ast from './ast-utils.js'

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
              if (expr.f.type === 'lambda-expr') {
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
  const argTable = new Map();
  for (let i = 0; i < f.params.length; i++) {
    argTable.set(f.params[i], args[i]);
  }
  const substituted = substitute(argTable, f.body);
  ectx.current = _ => substituted;
  return ectx;
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
  const syms = def.params.map(p => p === ast.astUnit() || p === ast.astWildcard() ? p : gensym());
  for (let i = 0; i < syms.length; i++) {
    varTable.set(def.params[i], syms[i]);
  }
  const newExpr = ectx.current(ast.funApp(ast.lambdaExpr(syms, def.body), args));
  ectx.current = _ => newExpr;
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
