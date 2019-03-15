import { expect } from 'chai'
import * as stepper from '@/ocha/stepper.js'
import * as ast from '@/ocha/ast-utils.js'
import * as printer from '@/ocha/printer.js'

describe('stepper.js', () => {
  it('should step value', () => {
    const target = 10;
    expect(printer.printExpr(stepper.step([], target))).to.equal('10');
  })

  it('should step function application.', () => {
    const target = ast.funApp(ast.lambdaExpr(['x'], 'x'), [3]);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })

  it('should step simple reset.', () => {
    const target = ast.reset(3);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })
})
