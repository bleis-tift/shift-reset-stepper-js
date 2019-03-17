export class AstIdent {
  constructor(name) {
    this.type = 'ident';
    this.name = name;
  }
}

export class AstDefFun {
  constructor(ident, params, body) {
    this.type = 'function-definition';
    this.ident = ident;
    this.params = params;
    this.body = body;
  }
}

export class AstAppFun {
  constructor(f, args) {
    this.type = 'function-application';
    this.f = f;
    this.args = args;

    this.isValue = false;
  }
}

export class AstLambdaExpr {
  constructor(params, body) {
    this.type = 'lambda-expr';
    this.params = params;
    this.body = body;

    this.isValue = true;
  }
}

export class AstLetExpr {
  constructor(varName, varExpr, body) {
    this.type = 'let-expr';
    this.varName = varName;
    this.varExpr = varExpr;
    this.body = body;

    this.isValue = false;
  }
}

export class AstSeqExpr {
  constructor(expr1, expr2) {
    this.type = 'sequential-expr';
    this.expr1 = expr1;
    this.expr2 = expr2;

    this.isValue = false;
  }
}

export class AstIfExpr {
  constructor(condExpr, thenPart, elsePart) {
    this.type = 'if-expr';
    this.condExpr = condExpr;
    this.thenPart = thenPart;
    this.elsePart = elsePart;

    this.isValue = false;
  }
}

export class AstUnit {
  constructor() {
    this.type = 'unit';

    this.isValue = true;
  }
}

export class AstRefVar {
  construcor(name) {
    this.type = 'variable-reference';
    this.name = name;

    this.isValue = true;
  }
}

export class AstValue {
  constructor(value) {
    this.type = 'value';
    this.value = value;

    this.isValue = true;
  }
}

export class AstProgram {
  constructor(defs, expr) {
    this.type = 'program';
    this.defs = defs;
    this.expr = expr;
  }
}
