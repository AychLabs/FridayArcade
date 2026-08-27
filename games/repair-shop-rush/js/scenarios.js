(function (global) {
  "use strict";

  const diagnosticActions = ["inspect", "display-test", "boot-test", "hardware-check", "software-check", "network-test", "check-power"];
  const repairActions = ["connect-hdmi", "reseat-ram", "replace-ram", "restore-volume", "select-speakers", "manage-startup", "clean-adware", "reconnect-keyboard", "move-keyboard-port", "clear-storage", "enable-wifi", "restart-router", "replace-monitor"];

  function scenario(config) {
    return Object.freeze(Object.assign({
      deviceType: "Desktop PC",
      neutralActions: ["inspect"],
      relevantActions: [],
      evidence: {},
      servicePayout: 90,
      repairCost: 0
    }, config));
  }

  const scenarios = [
    scenario({
      id: "loose-display-cable", customerName: "Maya", complaint: "No picture on the monitor. It was working yesterday.", shortComplaint: "No picture on the monitor.",
      correctRepair: "connect-hdmi", requiredItem: "HDMI Cable", servicePayout: 90, repairCost: 8,
      relevantActions: ["inspect", "display-test", "hardware-check", "check-power", "connect-hdmi", "replace-monitor", "reseat-ram"],
      evidence: { inspect: "Computer fans and power light are on.", "check-power": "Monitor power light is on.", "display-test": "Monitor reports NO SIGNAL.", "hardware-check": "The display cable is loose at the computer." },
      testBroken: "NO SIGNAL — the monitor still has no image.", testFixed: "Boot screen appears in clear 1080p.", successDialog: "A cable caused all that drama? Thank you!",
      explanation: "Power was present and the loose display connection explained the monitor's NO SIGNAL message."
    }),
    scenario({
      id: "loose-ram", customerName: "Theo", complaint: "It powers on, beeps at me, then does nothing.", shortComplaint: "Powers on, but will not boot.",
      correctRepair: "reseat-ram", servicePayout: 105,
      relevantActions: ["inspect", "boot-test", "hardware-check", "check-power", "reseat-ram", "connect-hdmi", "replace-monitor"],
      evidence: { inspect: "System powers on, but startup stops with repeating beeps.", "boot-test": "Boot warning: memory check failed.", "hardware-check": "One RAM module is not fully seated.", "check-power": "Computer and monitor both receive power." },
      testBroken: "MEMORY ERROR — startup stops after the beep code.", testFixed: "Memory detected. The operating system starts normally.", successDialog: "It just needed a better seat? Honestly, same.",
      explanation: "The memory beep code and failed memory check pointed to the unseated RAM module."
    }),
    scenario({
      id: "muted-speakers", customerName: "Gloria", deviceType: "Laptop", complaint: "My speakers stopped working after my grandson used the laptop.", shortComplaint: "No sound from the speakers.",
      correctRepair: "restore-volume", servicePayout: 75,
      relevantActions: ["inspect", "hardware-check", "software-check", "restore-volume"], neutralActions: ["inspect", "check-power"],
      evidence: { inspect: "The laptop speakers are undamaged.", "hardware-check": "Audio hardware passes its basic check.", "software-check": "System volume is muted and set to 0." },
      testBroken: "The audio test plays complete and total silence.", testFixed: "Startup chime plays. Speakers are working.", successDialog: "You found my sound! Tell the internet it is forgiven.",
      explanation: "Working audio hardware plus a muted volume setting isolated the cause to software controls."
    }),
    scenario({
      id: "adware-slowdown", customerName: "Dev", deviceType: "Laptop", complaint: "It is very slow, but it opens coupon ads instantly.", shortComplaint: "Very slow, with strange advertisements.",
      correctRepair: "clean-adware", servicePayout: 100, repairCost: 10,
      relevantActions: ["inspect", "boot-test", "hardware-check", "software-check", "clean-adware", "clear-storage"],
      evidence: { inspect: "Fake offer windows keep appearing; hardware looks intact.", "boot-test": "Many unwanted programs launch during startup.", "hardware-check": "Processor, memory, and storage hardware pass.", "software-check": "Adware and unwanted browser extensions are detected." },
      testBroken: "The desktop loads slowly beneath a majestic pile of popups.", testFixed: "Startup is quick and the desktop is popup-free.", successDialog: "Amazing. I was running out of ways to decline free toolbars.",
      explanation: "Normal hardware tests and unwanted startup programs identified adware as the slowdown."
    }),
    scenario({
      id: "faulty-usb-port", customerName: "Nia", complaint: "My keyboard stopped working.", shortComplaint: "Keyboard does not respond.",
      correctRepair: "move-keyboard-port", servicePayout: 95,
      relevantActions: ["inspect", "hardware-check", "reconnect-keyboard", "move-keyboard-port"],
      evidence: { inspect: "The keyboard cable is plugged into the front USB port.", "hardware-check": "The keyboard works on the tester; the current USB port fails its check." },
      testBroken: "No keystrokes are detected through the current USB port.", testFixed: "Keyboard input is detected through a working USB port.", successDialog: "The keyboard lives! I will avoid that port.",
      explanation: "The keyboard passed its test while the original USB port failed, isolating the port as faulty."
    }),
    scenario({
      id: "keyboard-unplugged", customerName: "Omar", complaint: "My keyboard stopped working.", shortComplaint: "Keyboard does not respond.",
      correctRepair: "reconnect-keyboard", servicePayout: 80,
      relevantActions: ["inspect", "hardware-check", "reconnect-keyboard", "move-keyboard-port"],
      evidence: { inspect: "The keyboard cable is hanging loose behind the computer.", "hardware-check": "The keyboard itself responds normally on the tester." },
      testBroken: "No keyboard is detected.", testFixed: "Keyboard connected. Keystrokes register normally.", successDialog: "That plug looked connected from my chair. Thanks!",
      explanation: "The loose cable and a working keyboard test showed that reconnection—not replacement—was needed."
    }),
    scenario({
      id: "storage-nearly-full", customerName: "Priya", deviceType: "Laptop", complaint: "The computer is slow and keeps showing storage warnings.", shortComplaint: "Slow computer with storage warnings.",
      correctRepair: "clear-storage", servicePayout: 100, repairCost: 5,
      relevantActions: ["inspect", "boot-test", "hardware-check", "software-check", "clear-storage", "clean-adware"],
      evidence: { inspect: "A low-storage warning appears after login.", "boot-test": "Startup is slow while the system searches for free space.", "hardware-check": "Storage hardware passes its health test.", "software-check": "The drive is 98% full, mostly temporary files." },
      testBroken: "Storage remains critically low and the computer is still sluggish.", testFixed: "Storage warning cleared. The computer responds normally.", successDialog: "Fast again, and I did not need a new drive!",
      explanation: "A healthy drive at 98% capacity showed that unnecessary files—not failed hardware—caused the slowdown."
    }),
    scenario({
      id: "wifi-disabled", customerName: "Luis", deviceType: "Laptop", complaint: "My internet is broken.", shortComplaint: "Cannot connect to the internet.",
      correctRepair: "enable-wifi", servicePayout: 85,
      relevantActions: ["inspect", "software-check", "network-test", "enable-wifi", "restart-router"],
      evidence: { inspect: "The laptop shows no available wireless connection.", "software-check": "Wi-Fi is disabled on this computer.", "network-test": "The shop network works on another device." },
      testBroken: "This computer remains offline.", testFixed: "Wi-Fi connected. A test page loads successfully.", successDialog: "The internet was hiding behind one switch. Thank you!",
      explanation: "The network worked on another device while this laptop's Wi-Fi was disabled."
    }),
    scenario({
      id: "router-restart", customerName: "Avery", deviceType: "Laptop", complaint: "The internet isn't working.", shortComplaint: "Cannot connect to the internet.",
      correctRepair: "restart-router", servicePayout: 100,
      relevantActions: ["inspect", "software-check", "network-test", "enable-wifi", "restart-router"],
      evidence: { inspect: "The laptop is connected to Wi-Fi but has no internet access.", "software-check": "Wi-Fi is enabled and its settings are valid.", "network-test": "Multiple devices lose connectivity; the router is unresponsive." },
      testBroken: "Wi-Fi connects, but no internet traffic passes through the router.", testFixed: "Router is online. The connection test succeeds.", successDialog: "We're back online. Nicely diagnosed!",
      explanation: "Valid Wi-Fi settings plus failures on multiple devices isolated the router as the problem."
    }),
    scenario({
      id: "failed-monitor", customerName: "Sam", complaint: "No picture on the monitor.", shortComplaint: "No picture on the monitor.",
      correctRepair: "replace-monitor", requiredItem: "Spare Monitor", servicePayout: 120, repairCost: 25,
      relevantActions: ["inspect", "display-test", "hardware-check", "check-power", "connect-hdmi", "replace-monitor", "reseat-ram"],
      evidence: { inspect: "Computer boots normally; the monitor screen remains black.", "check-power": "The monitor receives power and its indicator is lit.", "display-test": "A known-good monitor displays the computer's image.", "hardware-check": "The display cable is secure and passes continuity testing." },
      testBroken: "The original powered monitor still shows a black screen.", testFixed: "The working monitor displays the desktop normally.", successDialog: "There it is! Now I can see all my unread email.",
      explanation: "A secure cable and a successful known-good monitor test isolated the original monitor as failed."
    })
  ];

  const advanced = [
    scenario({
      id:"storage-startup-bloat",customerName:"Jordan",deviceType:"Laptop",complaint:"This computer takes forever to start, and everything feels slow.",shortComplaint:"Slow startup and poor performance.",servicePayout:135,
      relevantActions:["inspect","boot-test","software-check","clear-storage","manage-startup"],neutralActions:["inspect","hardware-check"],
      evidence:{inspect:"⚠ Low-storage warning appears after login.","boot-test":"⚠ Startup takes much longer than expected.","software-check":"✓ Storage usage: 96%."},
      issues:[{id:"storage",action:"clear-storage",resolvedEvidence:"✓ Temporary files cleaned.",visual:"storage"},{id:"startup",action:"manage-startup",requiresTestAfter:["storage"],resolvedEvidence:"✓ Startup programs cleaned.",discoverEvidence:"✓ 11 unnecessary startup apps found.",visual:"startup"}],
      partialTests:[{after:["storage"],text:"Startup improved, but the system is still unusually slow.",evidence:"⚠ Startup remains unusually slow."}],testBroken:"Storage is critically low and startup remains slow.",testFixed:"Storage is healthy and startup is quick.",successDialog:"That feels like a new computer. Almost suspiciously fast.",explanation:"Cleaning storage helped, and verification exposed unnecessary startup programs that also needed attention."
    }),
    scenario({
      id:"loose-hdmi-failed-monitor",customerName:"Riley",complaint:"I keep losing the picture. Yesterday it worked; today it has chosen violence.",shortComplaint:"Picture cuts in and out.",servicePayout:165,
      relevantActions:["inspect","display-test","hardware-check","check-power","connect-hdmi","replace-monitor"],
      evidence:{inspect:"⚠ The HDMI plug shifts in its socket.","check-power":"✓ Computer and monitor have power.","display-test":"⚠ Display signal is intermittent."},
      issues:[{id:"cable",action:"connect-hdmi",requiredItem:"HDMI Cable",resolvedEvidence:"✓ HDMI cable firmly reconnected.",visual:"display"},{id:"monitor",action:"replace-monitor",requiredItem:"Spare Monitor",requiresTestAfter:["cable"],resolvedEvidence:"✓ Failing monitor replaced.",discoverEvidence:"⚠ Known-good monitor remains stable; original monitor flickers.",visual:"flicker"}],
      partialTests:[{after:["cable"],text:"The image returns, then flickers out again.",evidence:"⚠ Intermittent display failure remains."}],testBroken:"The display still loses its picture.",testFixed:"Display remains stable through an extended test.",successDialog:"A steady picture! My eyes thank you.",explanation:"The loose cable was real, but testing revealed the monitor itself was also failing."
    }),
    scenario({
      id:"muted-wrong-output",customerName:"Casey",deviceType:"Laptop",complaint:"I can't hear anything. It just acts weird sometimes.",shortComplaint:"No audio output.",servicePayout:120,
      relevantActions:["inspect","hardware-check","software-check","restore-volume","select-speakers"],
      evidence:{inspect:"✓ Speakers show no physical damage.","hardware-check":"✓ Audio hardware passes.","software-check":"⚠ System volume is muted."},
      issues:[{id:"mute",action:"restore-volume",resolvedEvidence:"✓ System volume unmuted.",visual:"audio"},{id:"output",action:"select-speakers",requiresTestAfter:["mute"],resolvedEvidence:"✓ Speakers selected as audio output.",discoverEvidence:"⚠ Audio is routed to a disconnected display.",visual:"output"}],
      partialTests:[{after:["mute"],text:"Volume is on, but the test sound still goes to the wrong device.",evidence:"⚠ Wrong audio output remains."}],testBroken:"The audio test is silent.",testFixed:"Test chime plays clearly through the speakers.",successDialog:"Sound! I knew those speakers were not decorative.",explanation:"The system was muted and routed to the wrong output; both settings had to be corrected."
    }),
    scenario({
      id:"wifi-router-combo",customerName:"Morgan",deviceType:"Laptop",complaint:"The internet icon looks normal-ish, but nothing actually loads.",shortComplaint:"No internet access all morning.",servicePayout:140,
      relevantActions:["inspect","software-check","network-test","enable-wifi","restart-router"],
      evidence:{inspect:"⚠ Laptop is offline.","software-check":"⚠ Wi-Fi is disabled.","network-test":"⚠ Network access cannot be confirmed."},
      issues:[{id:"wifi",action:"enable-wifi",resolvedEvidence:"✓ Wi-Fi enabled.",visual:"wifi"},{id:"router",action:"restart-router",requiresTestAfter:["wifi"],resolvedEvidence:"✓ Router restarted.",discoverEvidence:"⚠ Other devices also cannot reach the internet.",visual:"network"}],
      partialTests:[{after:["wifi"],text:"Wi-Fi connects, but no websites load. The router is not responding.",evidence:"⚠ Router is unresponsive."}],testBroken:"The computer remains offline.",testFixed:"Wi-Fi connects and a test page loads.",successDialog:"The internet has returned from its vacation.",explanation:"Enabling Wi-Fi restored the local link; verification then isolated a second problem at the router."
    }),
    scenario({
      id:"loose-and-faulty-ram",customerName:"Taylor",complaint:"It boots sometimes, crashes other times, and now it barely starts.",shortComplaint:"Unstable boot and crashes.",servicePayout:170,
      relevantActions:["inspect","boot-test","hardware-check","reseat-ram","replace-ram"],neutralActions:["inspect","check-power"],
      evidence:{inspect:"⚠ Startup stops with a memory warning.","boot-test":"⚠ Memory is not detected consistently.","hardware-check":"⚠ One RAM module is loose."},
      issues:[{id:"loose-ram",action:"reseat-ram",requiresToolkit:true,resolvedEvidence:"✓ Loose RAM module reseated.",visual:"boot"},{id:"bad-ram",action:"replace-ram",requiredItem:"RAM Module",requiresToolkit:true,requiresTestAfter:["loose-ram"],resolvedEvidence:"✓ Faulty RAM module replaced.",discoverEvidence:"⚠ Memory test identifies the second module as faulty.",visual:"memory"}],
      partialTests:[{after:["loose-ram"],text:"The machine boots, but a simple memory test still reports instability.",evidence:"⚠ Second RAM module fails memory test."}],testBroken:"Startup still fails its memory check.",testFixed:"Memory test passes and repeated boots remain stable.",successDialog:"Three stable starts in a row. Beautiful.",explanation:"Reseating one module restored booting, and verification revealed the second module was faulty."
    }),
    scenario({
      id:"adware-startup-bloat",customerName:"Sky",deviceType:"Laptop",complaint:"It takes forever to boot and ads keep popping up. Very eager ads.",shortComplaint:"Slow boot with popups.",servicePayout:145,
      relevantActions:["inspect","boot-test","software-check","clean-adware","manage-startup"],neutralActions:["inspect","hardware-check"],
      evidence:{inspect:"⚠ Popups cover the desktop.","boot-test":"⚠ Too many programs launch at startup.","software-check":"⚠ Adware and unnecessary startup apps detected."},
      issues:[{id:"adware",action:"clean-adware",resolvedEvidence:"✓ Adware removed.",visual:"popups"},{id:"startup",action:"manage-startup",resolvedEvidence:"✓ Unnecessary startup programs disabled.",visual:"startup"}],
      testBroken:"Popups and slow startup remain.",testFixed:"Startup is quick and the desktop stays popup-free.",successDialog:"Fast and no fake prizes. Perfect.",explanation:"Adware caused the popups while separate startup programs slowed every boot."
    }),
    scenario({
      id:"keyboard-loose-bad-port",customerName:"Drew",complaint:"My keyboard keeps cutting out, usually right when I am winning.",shortComplaint:"Keyboard cuts out intermittently.",servicePayout:115,
      relevantActions:["inspect","hardware-check","reconnect-keyboard","move-keyboard-port"],
      evidence:{inspect:"⚠ Keyboard plug is loose.","hardware-check":"✓ Keyboard itself passes a basic check."},
      issues:[{id:"connection",action:"reconnect-keyboard",resolvedEvidence:"✓ Keyboard reconnected.",visual:"keyboard"},{id:"usb-port",action:"move-keyboard-port",requiresTestAfter:["connection"],resolvedEvidence:"✓ Keyboard moved to a reliable USB port.",discoverEvidence:"⚠ Input drops again through the original port.",visual:"usb"}],
      partialTests:[{after:["connection"],text:"Keystrokes register briefly, then stop again.",evidence:"⚠ Original USB port is unreliable."}],testBroken:"Keyboard input still cuts out.",testFixed:"Keyboard remains responsive through a sustained input test.",successDialog:"Now my heroic comeback can continue.",explanation:"The loose plug caused an obvious failure, but testing revealed the original USB port was unreliable too."
    }),
    scenario({
      id:"storage-malware-combo",customerName:"Alex",deviceType:"Laptop",complaint:"The computer is full, slow, and keeps showing weird popups.",shortComplaint:"Full storage, slow system, popups.",servicePayout:150,
      relevantActions:["inspect","boot-test","hardware-check","software-check","clear-storage","clean-adware"],
      evidence:{inspect:"⚠ Low-storage warning and popups appear.","boot-test":"⚠ Startup is unusually slow.","software-check":"⚠ Drive is 97% full; unwanted software is detected."},
      issues:[{id:"storage",action:"clear-storage",resolvedEvidence:"✓ Temporary files cleaned.",visual:"storage"},{id:"malware",action:"clean-adware",resolvedEvidence:"✓ Malware and adware removed.",visual:"popups"}],
      testBroken:"Low storage and popups still affect the system.",testFixed:"Storage is healthy, performance is normal, and no popups return.",successDialog:"Clean, quick, and no mysterious coupons.",explanation:"Low storage and malware were independent problems, so either could be fixed first but both required verification."
    })
  ];

  const actionCosts = Object.freeze({ "display-test":5, "boot-test":5, "hardware-check":5, "software-check":5, "network-test":5, "connect-hdmi":8, "replace-ram":18, "clean-adware":10, "clear-storage":5, "replace-monitor":25 });

  global.RepairScenarios = Object.freeze({
    all: Object.freeze(scenarios), advanced: Object.freeze(advanced), diagnosticActions: Object.freeze(diagnosticActions), repairActions: Object.freeze(repairActions), actionCosts,
    shuffled(limit, level) {
      const copy = (level===3?advanced:scenarios).slice();
      for (let i=copy.length-1;i>0;i-=1) { const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
      return copy.slice(0, limit || copy.length);
    }
  });
}(window));
