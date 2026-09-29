import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
const launcher = pathToFileURL(
  path.resolve("apps/web/scripts/local-launch.mjs"),
).href;
describe("supported loopback launch and raw Node ingress", () => {
  it("test terminal hygiene captures pairing only in memory and redacts split stdout/stderr diagnostics", () => {
    const hygieneModule = pathToFileURL(
      path.resolve("scripts/e2e-log-hygiene.mjs"),
    ).href;
    const code = `import {createE2ETerminalSink} from ${JSON.stringify(hygieneModule)};import {randomBytes} from 'node:crypto';const secret=randomBytes(32).toString('hex');let captured,output='',redactions=0;const sink=createE2ETerminalSink(value=>output+=value,value=>captured=value,()=>redactions++);sink.push('Local pairing secret (terminal only): '+secret.slice(0,20));sink.push(secret.slice(20)+'\\n');sink.push('Server/client diagnostic '+secret.slice(0,19));sink.push(secret.slice(19)+'\\n');sink.push('Partial '+secret);sink.end();process.stdout.write(JSON.stringify({captured:captured===secret,secretAbsent:!output.includes(secret),pairingLineAbsent:!output.includes('Local pairing secret'),redactions}));`;
    expect(
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", code], {
          encoding: "utf8",
        }),
      ),
    ).toEqual({
      captured: true,
      secretAbsent: true,
      pairingLineAbsent: true,
      redactions: 2,
    });
  });
  it.each(["dev", "start"])(
    "%s explicitly passes supported --hostname and per-start boundary",
    (mode) => {
      const code = `import {localLaunch} from ${JSON.stringify(launcher)}; const value=localLaunch(${JSON.stringify(mode)},['--port','3100'],{}); process.stdout.write(JSON.stringify({args:value.args,origin:value.env.CAPACITY_GOVERNOR_ORIGIN,keyLength:value.env.CAPACITY_GOVERNOR_INGRESS_KEY.length,preload:value.env.NODE_OPTIONS.includes('local-ingress.mjs')}));`;
      const result = JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", code], {
          encoding: "utf8",
        }),
      );
      expect(result).toEqual({
        args: [mode, "--port", "3100", "--hostname", "127.0.0.1"],
        origin: "http://127.0.0.1:3100",
        keyLength: 64,
        preload: true,
      });
    },
  );
  it.each([
    { args: ["--hostname", "0.0.0.0"] },
    { args: ["-H", "127.0.0.1"] },
    { args: ["--hostname=0.0.0.0"] },
  ])("caller hostname args %j are rejected", ({ args }) => {
    const code = `import {localLaunch} from ${JSON.stringify(launcher)}; try {localLaunch('dev',${JSON.stringify(args)},{});process.stdout.write('allowed')} catch {process.stdout.write('denied')}`;
    expect(
      execFileSync(process.execPath, ["--input-type=module", "-e", code], {
        encoding: "utf8",
      }),
    ).toBe("denied");
  });
  it("non-loopback HOST and invalid port fail closed", () => {
    const code = `import {localLaunch} from ${JSON.stringify(launcher)}; process.stdout.write(JSON.stringify([{HOST:'0.0.0.0'},{PORT:'65536'}].map(env=>{try {localLaunch('dev',[],env);return false}catch{return true}})))`;
    expect(
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", code], {
          encoding: "utf8",
        }),
      ),
    ).toEqual([true, true]);
  });
  it("raw ingress rejects forged Host/Origin/forwarding/admission before framework synthesis", () => {
    const hook = pathToFileURL(
      path.resolve("apps/web/scripts/local-ingress.mjs"),
    ).href;
    const code = `const http=require('node:http');const server=http.createServer((req,res)=>{res.end(req.headers['x-cg-ingress-proof']?'admitted':'missing')});server.listen(0,'127.0.0.1',async()=>{const port=server.address().port;process.env.CAPACITY_GOVERNOR_ORIGIN='http://127.0.0.1:'+port;process.env.CAPACITY_GOVERNOR_INGRESS_KEY='a'.repeat(64);await import(${JSON.stringify(hook)});const origin=process.env.CAPACITY_GOVERNOR_ORIGIN;const cases=[['GET',{}],['POST',{origin}],['POST',{}],['POST',{origin:'http://attacker.invalid'}],['GET',{host:'localhost:'+port}],['GET',{'x-forwarded-host':'127.0.0.1:'+port}],['GET',{'x-forwarded-for':'127.0.0.1'}],['GET',{'forwarded':'host=127.0.0.1'}],['GET',{'x-cg-ingress-proof':'forged'}]];const statuses=[];for(const [method,headers] of cases)statuses.push(await new Promise((resolve,reject)=>{const req=http.request(origin,{method,headers},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end()}));process.stdout.write(JSON.stringify(statuses));server.close()});`;
    expect(
      JSON.parse(
        execFileSync(process.execPath, ["-e", code], {
          encoding: "utf8",
          timeout: 20000,
        }),
      ),
    ).toEqual([200, 200, 403, 403, 403, 403, 403, 403, 403]);
  });
  it("raw ingress rejects an external socket peer even with forged loopback Host and Origin", () => {
    const hook = pathToFileURL(
      path.resolve("apps/web/scripts/local-ingress.mjs"),
    ).href;
    const code = `const http=require('node:http');const server=http.createServer(()=>{});server.listen(0,'127.0.0.1',async()=>{const port=server.address().port;process.env.CAPACITY_GOVERNOR_ORIGIN='http://127.0.0.1:'+port;process.env.CAPACITY_GOVERNOR_INGRESS_KEY='a'.repeat(64);await import(${JSON.stringify(hook)});let status=0;const host='127.0.0.1:'+port;server.emit('request',{headers:{host,origin:'http://'+host},rawHeaders:['Host',host,'Origin','http://'+host],method:'POST',url:'/access/test-signin',socket:{remoteAddress:'203.0.113.9'}},{writeHead:code=>status=code,end:()=>{}});process.stdout.write(String(status));server.close()});`;
    expect(
      execFileSync(process.execPath, ["-e", code], {
        encoding: "utf8",
        timeout: 20000,
      }),
    ).toBe("403");
  });
});
