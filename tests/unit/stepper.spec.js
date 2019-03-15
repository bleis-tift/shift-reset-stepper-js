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

  it('should step function application.', () => {
    const target = ast.funApp(ast.lambdaExpr(['x'], 'x'), [3]);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })

  for (const [target, expected] of [
    ['(fun x -> x) (f ())', '(fun x -> x) ((fun () -> 10) ())'],
    ['(fun x -> x) (fun _ -> f ()) (f ())', '(fun x -> x) (fun _ -> f ()) ((fun () -> 10) ())'],
  ]) {
    it('should step arg.', () => {
      const p = parser.parse('let f () = 10;;' + target + ';;');
      expect(printer.printExpr(stepper.step(p.defs, p.expr))).to.equal(expected);
    })
  }

  it('should step simple reset.', () => {
    const target = ast.reset(3);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })
})
