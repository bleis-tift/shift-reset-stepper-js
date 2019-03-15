export function printAst(ast) {
  const expr = ast.expr;
  const res = [];
  for (const def of ast.defs) {
    res.push(printDef(def));
  }
  res.push(printExpr(ast.expr));
  return res.join(';;\n\n');
}

function printDef(def) {
  return 'let ' + def.ident + ' ' + printParams(def.params) + ' =\n  ' + printExpr(def.body);
}

export function printExpr(expr) {
  switch (expr.type) {
    case 'function-application':
      switch (expr.f) {
        case '+':
        case '-':
        case '*':
        case '/':
          return printExpr(expr.args[0]) + ' ' + expr.f + ' ' + printExpr(expr.args[1]);
        default:
          if (!expr.f) {
            return 'oops!';
          }
          if (expr.f.type) {
            return '(' + printExpr(expr.f) + ') ' + printArgs(expr.args);
          } else {
            return printExpr(expr.f) + ' ' + printArgs(expr.args);
          }
      }
    case 'lambda-expr':
      return 'fun ' + printParams(expr.params) + ' -> ' + printExpr(expr.body);
    case undefined:
      switch (expr) {
        case 'ast-unit':
          return '()';
        case 'ast-wildcard':
          return '_';
        default:
          return expr + '';
      }
  }
  throw new Error('unsupported type: ' + expr.type);
}

function printParam(param) {
  switch (param) {
    case 'ast-unit':
      return '()';
    case 'ast-wildcard':
      return '_';
    default:
      return param;
  }
}

function printParams(params) {
  const res = [];
  for (const p of params) {
    res.push(printParam(p));
  }
  return res.join(' ');
}

function printArgs(args) {
  const res = [];
  for (const arg of args) {
    switch (arg.type) {
      case 'lambda-expr':
      case 'function-application':
        res.push('(' + printExpr(arg) + ')');
        break;
      default:
        res.push(printExpr(arg));
        break;
    }
  }
  return res.join(' ');
}
