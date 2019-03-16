import { expect } from 'chai'
import * as stepper from '@/ocha/stepper.js'
import * as parser from '@/ocha/parser.js'
import * as ast from '@/ocha/ast-utils.js'
import * as printer from '@/ocha/printer.js'

describe('stepper.js', () => {
  for (const target of [10, ast.lambdaExpr([ast.astUnit()], 20)]) {
    it('should step value.', () => {
      expect(printer.printExpr(stepper.step([], target))).to.equal(printer.printExpr(target));
    })
  }

  for (const [target, expected] of [
    ['5 * 2', '10'],
    ['5 + 2', '7'],
    ['5 - 2', '3'],
    ['5 + 6 / 3', '5 + 2'],
  ]) {
    it('should step op application. input=[' + target + ']', () => {
      const p = parser.parse(target + ';;');
      expect(printer.printExpr(stepper.step([], p.expr))).to.equal(expected);
    })
  }

  it('should step function application.', () => {
    const target = ast.funApp(ast.lambdaExpr(['x'], 'x'), [3]);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })

  for (const [target, expected] of [
    ['(fun x -> x) (f ())', '(fun x -> x) ((fun () -> 10) ())'],
    ['(fun x -> x) ((fun () -> 10) ())', '(fun x -> x) 10'],
    ['(fun x -> x) (fun _ -> f ()) (f ())', '(fun x -> x) (fun _ -> f ()) ((fun () -> 10) ())'],
    ['(fun x y -> x + y) (f ()) 10', '(fun x y -> x + y) ((fun () -> 10) ()) 10'],
  ]) {
    it('should step arg. input=[' + target + '], expected=[' + expected + ']', () => {
      const p = parser.parse('let f () = 10;;' + target + ';;');
      expect(printer.printExpr(stepper.step(p.defs, p.expr))).to.equal(expected);
    })
  }

  it('should step simple sample.', () => {
    const init = 'let f g x = g x;; f (fun x -> x) 10;;';
    const p = parser.parse(init);
    let next = stepper.step(p.defs, p.expr);
    expect(printer.printExpr(next)).to.equal('(fun g x -> g x) (fun x -> x) 10');

    next = stepper.step(p.defs, next);
    expect(printer.printExpr(next)).to.equal('(fun x -> (fun x -> x) x) 10');

    next = stepper.step(p.defs, next);
    expect(printer.printExpr(next)).to.equal('(fun x -> x) 10');

    next = stepper.step(p.defs, next);
    expect(printer.printExpr(next)).to.equal('10');
  })

  it('should step simple reset.', () => {
    const target = ast.reset(3);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })

  it('should step nested reset.', () => {
    const init = 'reset (fun () -> 5 + reset (fun () -> 8)) + 10;;';
    const p = parser.parse(init);
    let next = stepper.step(p.defs, p.expr);
    expect(printer.printExpr(next)).to.equal('reset (fun () -> 5 + 8) + 10');
  })
})
