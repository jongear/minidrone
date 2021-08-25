import rewire from "rewire"
const swarm = rewire("./swarm")
const cooldown = swarm.__get__("cooldown")
// @ponicode
describe("cooldown", () => {
    test("0", () => {
        let callFunction: any = () => {
            cooldown()
        }
    
        expect(callFunction).not.toThrow()
    })
})
