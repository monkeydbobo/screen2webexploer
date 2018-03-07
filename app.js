var WebSocketServer = require('ws').Server
  , http = require('http')
  , express = require('express')
  , path = require('path')
  , net = require('net')
  , app = express()

// 封装Device对象 Device(web_port, mobile_port)
var Device = function (port,device_port) {
    app.use(express.static(path.join(__dirname, '/public')))

    var server = http.createServer(app)
    var wss = new WebSocketServer({server: server})
    wss.on('connection', function(ws) {
        console.info('Got a client2')

        var stream0 = net.connect({
            port: device_port
        })

        stream0.on('error', function() {
            console.error('Be sure to run `adb forward tcp:1719 localabstract:minicap`')
            process.exit(1)
        })

        // minicap stream
        var readBannerBytes = 0
        var bannerLength = 2
        var readFrameBytes = 0
        var frameBodyLength = 0
        var frameBody = new Buffer(0)
        var banner = {
            version: 0
            , length: 0
            , pid: 0
            , realWidth: 0
            , realHeight: 0
            , virtualWidth: 0
            , virtualHeight: 0
            , orientation: 0
            , quirks: 0
        }


        function tryRead(stream) {
            for (var chunk; (chunk = stream.read());) {
                //console.info('chunk(length=%d)', chunk.length)
                for (var cursor = 0, len = chunk.length; cursor < len;) {
                    if (readBannerBytes < bannerLength) {
                        switch (readBannerBytes) {
                            case 0:
                                // version
                                banner.version = chunk[cursor]
                                break
                            case 1:
                                // length
                                banner.length = bannerLength = chunk[cursor]
                                break
                            case 2:
                            case 3:
                            case 4:
                            case 5:
                                // pid
                                banner.pid +=
                                    (chunk[cursor] << ((readBannerBytes - 2) * 8)) >>> 0
                                break
                            case 6:
                            case 7:
                            case 8:
                            case 9:
                                // real width
                                banner.realWidth +=
                                    (chunk[cursor] << ((readBannerBytes - 6) * 8)) >>> 0
                                break
                            case 10:
                            case 11:
                            case 12:
                            case 13:
                                // real height
                                banner.realHeight +=
                                    (chunk[cursor] << ((readBannerBytes - 10) * 8)) >>> 0
                                break
                            case 14:
                            case 15:
                            case 16:
                            case 17:
                                // virtual width
                                banner.virtualWidth +=
                                    (chunk[cursor] << ((readBannerBytes - 14) * 8)) >>> 0
                                break
                            case 18:
                            case 19:
                            case 20:
                            case 21:
                                // virtual height
                                banner.virtualHeight +=
                                    (chunk[cursor] << ((readBannerBytes - 18) * 8)) >>> 0
                                break
                            case 22:
                                // orientation
                                banner.orientation += chunk[cursor] * 90
                                break
                            case 23:
                                // quirks
                                banner.quirks = chunk[cursor]
                                break
                        }

                        cursor += 1
                        readBannerBytes += 1

                        if (readBannerBytes === bannerLength) {
                            // console.log('banner', banner)
                        }
                    }
                    else if (readFrameBytes < 4) {
                        frameBodyLength += (chunk[cursor] << (readFrameBytes * 8)) >>> 0
                        cursor += 1
                        readFrameBytes += 1
                        //console.info('headerbyte%d(val=%d)', readFrameBytes, frameBodyLength)
                    }
                    else {
                        if (len - cursor >= frameBodyLength) {
                            //console.info('bodyfin(len=%d,cursor=%d)', frameBodyLength, cursor)

                            frameBody = Buffer.concat([
                                frameBody
                                , chunk.slice(cursor, cursor + frameBodyLength)
                            ])

                            // Sanity check for JPG header, only here for debugging purposes.
                            if (frameBody[0] !== 0xFF || frameBody[1] !== 0xD8) {
                                // console.error('Frame body does not start with JPG header', frameBody)
                                process.exit(1)
                            }

                            ws.send(frameBody, {
                                binary: true
                            })

                            cursor += frameBodyLength
                            frameBodyLength = readFrameBytes = 0
                            frameBody = new Buffer(0)
                        }
                        else {
                            // console.info('body(len=%d)', len - cursor)

                            frameBody = Buffer.concat([
                                frameBody
                                , chunk.slice(cursor, len)
                            ])

                            frameBodyLength -= len - cursor
                            readFrameBytes += len - cursor
                            cursor = len
                        }
                    }
                }
            }
        }
        stream0.on('readable',tryRead.bind(this,stream0))
        ws.on('close', function() {
            console.info('Lost a client')
            stream0.end()
        })
    })
    // var test = getDeviceList()
    // console.log("test",test);
    server.listen(port);
    console.info('Listening on port %d', port)
};
var TransData = function (data) {
    var server = http.createServer(app)
    var wss = new WebSocketServer({server: server})
    wss.on('connection',function (ws) {
        console.log(`[SERVER] connection()`);
        ws.on('message', function (message) {
            console.log(`[SERVER] Received: ${message}`);
            ws.send(data, (err) => {
                if (err) {
                    console.log(`[SERVER] error: ${err}`);
                }
            });
        })
    })
    server.listen(9008)
}
var TranDataToIndex = function (data) {
    var server = http.createServer(app)
    var wss = new WebSocketServer({server: server})
    wss.on('connection',function (ws) {
        console.log(`[SERVER] connection()`);
        ws.on('message', function (message) {
            console.log(`[SERVER] Received: ${message}`);
            ws.send(data, (err) => {
                if (err) {
                    console.log(`[SERVER] error: ${err}`);
                }
            });
        })
    })
    server.listen(9011)
}
// new TransData()
// new Device(9002,1717)
// new Device(9004,1719)

//StartDevices
var portArr = new Array()
function startDevices(devList,len) {
    var port = 9002,device_port=1717
    for (var i=0;i<len;i++,device_port+=2,port+=2){
        new Device(port,device_port)
        startAdb(devList[i],device_port)
        portArr.push(port)
    }
}
function startAdb(deviceNo,device_port) {
    var proc = require('child_process').spawn;
    startproc = proc('adb',['-s',deviceNo,'shell','LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/minicap -P 1080x1920@1080x1920/0']);
    startconn = proc('adb',['-s',deviceNo,'forward','tcp:'+device_port,'localabstract:minicap'])
    startproc.stdout.on('data', function (data) {
        console.log('START standard output:\n' + data);
    });
    startproc.stderr.on('data', function (data) {
        console.log('standard error output:\n' + data);
    });
    startproc.on('exit', function (code, signal) {
        console.log('child process eixt ,exit:' + code);
    });

}
/*
var RUN_SERVER_TEST = "adb shell LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/minicap -P 1440x2560@1440x2560/0 -t";
var RUN_SERVER = "adb shell LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/minicap -P 1080x1920@1080x1920/0";
*/

function execCmd(){
    var spawn = require('child_process').spawn;

    var nexus = "04a3dc48437df89b";
    var mi = "001c37e1";

    // su = spawn('adb',['shell','chmod','777','./data/local/tmp/minicap'])
    free = spawn('adb',['-s',nexus,'shell','LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/minicap -P 1080x1920@1080x1920/0']);
    zz = spawn('adb',['-s',nexus,'forward','tcp:1717','localabstract:minicap'])
    // zx = spawn('adb',['forward','tcp:1719','localabstract:minicap'])
    free = spawn('adb',['-s',mi,'shell','LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/minicap -P 1080x1920@1080x1920/0']);
    zz = spawn('adb',['-s',mi,'forward','tcp:1719','localabstract:minicap'])


    //捕获标准输出并将其打印到控制台
    free.stdout.on('data', function (data) {
        console.log('START standard output:\n' + data);
    });

    // 捕获标准错误输出并将其打印到控制台
    free.stderr.on('data', function (data) {
        console.log('standard error output:\n' + data);
    });

    // 注册子进程关闭事件
    free.on('exit', function (code, signal) {
        console.log('child process eixt ,exit:' + code);
    });

}
function Device(cpu_abi,sdk_version){
    this.cpu_abi = cpu_abi
    this.sdk_version = sdk_version
    this.logDev = function () {
        console.log("device info:"+"\n"+"cpu:"+cpu_abi+"\n"+"sdk:"+sdk_version)
    }
}
function getDeviceList() {
    var proc = require('child_process')
    devices = proc.spawn('adb',['devices'])
    devList = new Array() //多台手机列表
    devices.stdout.on('data', function (data) {
       console.log(data.toString())
        if (data.toString().indexOf("devices")){
           myArray = data.toString().split('\n')
           // myArray = data.toString().trim().replace(/[\r\n\t]/g, '').split('device')
            for (var i=0;i<myArray.length;i++){
                 if (i==0){
                  continue;
              }
              else{
                  devId = myArray[i].split('\t')
                  if (devId.indexOf('device') && devId !=''){
                      devList.push(devId[0])
                  }
              }
            }
            console.log('list:',devList,"len:"+devList.length)
            new TransData(devList.toString())
            startDevices(devList,devList.length)
            console.log(portArr.toString())
            TranDataToIndex(portArr.toString())
        }
    });
}
function getDeviceInfo() {
    var SDK_Version = require('child_process')

    abi =  SDK_Version.spawn('adb',['shell','getprop','ro.product.cpu.abi'])
    free = SDK_Version.spawn('adb',['shell','getprop','ro.build.version.sdk'])

    var sdk_version;
    var cpu_version;
    var flag;

    function getCpu(data) {
        cpu_version = data
        console.log("cpu_version:" + cpu_version)
        pushCpuFile(cpu_version)
    }
    function saveCpu(data) {
        flag = data
    }
    function getSdk (data) {
        sdk_version = data
        console.log("sdk_version:" + sdk_version)
        return {sdk:sdk_version}
    }

    function pushCpuFile(name) {
        var cmdPath = ['push','./bin/'+name+'/minicap','/data/local/tmp']
        out = SDK_Version.spawn('adb',cmdPath)
        out.stdout.on('data', function (data) {
            console.log('standard output:\n' + data);
        });
    }
    function pushSdkFile(sdk,flag) {
        var cmdPath = ['push','./libs/android-'+sdk+'/'+flag+'/minicap.so','data/local/tmp']
        out = SDK_Version.spawn('adb',cmdPath)
        out.stdout.on('data',function (data) {
            console.log('pushSh standard output:\n' + data);
        });
        function rpl(str){
            return str.replace(/[\r\n]/g, '');
        }
    }

    abi.stdout.on('data',function (data) {
        if (data.toString().trim().indexOf('arm') != -1){
            getCpu(data.toString());
            saveCpu(data.toString())
            free.stdout.on('data', function (data) {
                // console.log(data)
                // console.log("len:"+data.toString().trim().length+","+data.toString())
                if (data.toString().trim().length == 2){
                    console.log("pushSO:"+data.toString()+"whbcpu:"+flag)
                    pushSdkFile(data.toString().trim().replace(/[\r\n]/g, ''),flag.toString().replace(/[\r\n]/g, ''))
                }
            });
        }
    })

    free.stdout.on('data', function (data) {
        // console.log(data)
        // console.log("len:"+data.toString().trim().length+","+data.toString())
        if (data.toString().trim().replace(/[\r\n]/g, '').length == 2){
            getSdk(data.toString().trim().replace(/[\r\n]/g, ''))
        }
    });
}
getDeviceList()
// getDeviceInfo()
// execCmd()
// module.exports = Device;