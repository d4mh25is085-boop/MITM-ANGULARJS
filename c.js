(function () {
  "use strict";

  // STEP 1: Replace these two values with your Supabase project credentials.
  // Supabase Dashboard -> Project Settings -> API
  var SUPABASE_URL = "https://blbfzbsqmxkqpcuzmigy.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmZ6YnNxbXhrcXBjdXptaWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4NjYwMTksImV4cCI6MjEwOTQ0MjAxOX0._Ud40q2KFvmtP8Pvzs5UXhYjuSBujl0_PKddlYxGoOQ";

  var app = angular.module("campusFestApp", []);

  app.controller("FestController", ["$scope", "$timeout", function ($scope, $timeout) {
    var vm = this;
    var isConfigured = SUPABASE_URL.indexOf("https://") === 0 &&
                       SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
                       window.supabase;

    vm.configured = !!isConfigured;
    vm.client = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    vm.events = [];
    vm.categories = ["Technical", "Cultural", "Sports", "Hackathon"];
    vm.activeCategory = "All";
    vm.searchText = "";
    vm.user = null;
    vm.authOpen = false;
    vm.authMode = "login";
    vm.registerOpen = false;
    vm.drawerOpen = false;
    vm.busy = false;
    vm.auth = { email: "", password: "" };
    vm.rsvp = { name: "", usn: "", email: "", phone: "" };
    vm.myRegistrations = [];
    vm.authMessage = "";
    vm.registerMessage = "";
    vm.drawerMessage = "";
    vm.toast = "";
    vm.selectedEvent = {};

    // Demo records let the interface run before Supabase is configured.
    var demoEvents = [
      {id:"demo-1",title:"CodeSprint Hackathon",category:"Hackathon",venue:"Innovation Lab",date:"2026-11-20",event_time:"09:00",description:"Build something brilliant. Team up, prototype and pitch your boldest idea.",max_seats:50,remaining_seats:18,cancellation_deadline:"2026-11-19T18:00:00"},
      {id:"demo-2",title:"Battle of the Bands",category:"Cultural",venue:"Open Air Theatre",date:"2026-11-21",event_time:"17:30",description:"Bring the energy, find your rhythm and own the campus stage.",max_seats:100,remaining_seats:12,cancellation_deadline:"2026-11-20T18:00:00"},
      {id:"demo-3",title:"UI/UX Design Sprint",category:"Technical",venue:"Design Studio",date:"2026-11-20",event_time:"11:00",description:"A fast-paced design challenge focused on solving real user problems.",max_seats:40,remaining_seats:24,cancellation_deadline:"2026-11-19T18:00:00"},
      {id:"demo-4",title:"Campus Football Cup",category:"Sports",venue:"Main Ground",date:"2026-11-22",event_time:"08:30",description:"Show your teamwork, skill and sportsmanship on the field.",max_seats:80,remaining_seats:31,cancellation_deadline:"2026-11-21T18:00:00"},
      {id:"demo-5",title:"Robo-Race Challenge",category:"Technical",venue:"Mechanical Block",date:"2026-11-21",event_time:"10:00",description:"Design, test and race your bot through a thrilling obstacle course.",max_seats:35,remaining_seats:0,cancellation_deadline:"2026-11-20T18:00:00"},
      {id:"demo-6",title:"Street Dance Showdown",category:"Cultural",venue:"Central Quadrangle",date:"2026-11-22",event_time:"16:00",description:"A celebration of movement, music and fearless performance.",max_seats:70,remaining_seats:43,cancellation_deadline:"2026-11-21T18:00:00"}
    ];

    function enterAngular(fn) {
      $scope.$applyAsync(fn);
    }
    function showToast(message) {
      vm.toast = message;
      $timeout(function () { vm.toast = ""; }, 3000);
    }
    function handleError(error, fallback) {
      console.error(error);
      return (error && error.message) ? error.message : fallback;
    }
    function refreshEvents() {
      if (!vm.client) {
        vm.events = angular.copy(demoEvents);
        return;
      }
      vm.client.from("events")
        .select("*")
        .eq("published", true)
        .order("date", {ascending:true})
        .then(function (result) {
          enterAngular(function () {
            if (result.error) {
              vm.events = angular.copy(demoEvents);
              showToast("Could not load Supabase events. Showing demo events.");
            } else {
              vm.events = (result.data || []).map(function (event) {
                event.remaining_seats = Math.max(0, event.max_seats - (event.registered_count || 0));
                return event;
              });
            }
          });
        });
    }
    function loadRegistrations() {
      if (!vm.client || !vm.user) {
        vm.myRegistrations = [];
        return;
      }
      vm.client.from("registrations")
        .select("id, created_at, student_name, student_usn, student_phone, event:events(id,title,category,venue,date,event_time,cancellation_deadline)")
        .eq("user_id", vm.user.id)
        .eq("status", "confirmed")
        .order("created_at", {ascending:false})
        .then(function (result) {
          enterAngular(function () {
            if (result.error) {
              vm.drawerMessage = handleError(result.error, "Unable to load registrations.");
            } else {
              vm.myRegistrations = result.data || [];
              vm.drawerMessage = "";
            }
          });
        });
    }

    vm.filteredEvents = function () {
      return vm.events.filter(function (event) {
        var categoryMatch = vm.activeCategory === "All" || event.category === vm.activeCategory;
        var q = (vm.searchText || "").toLowerCase();
        var searchMatch = !q || [event.title,event.venue,event.category,event.guest_speaker || ""].join(" ").toLowerCase().indexOf(q) !== -1;
        return categoryMatch && searchMatch;
      });
    };
    vm.setCategory = function (category) { vm.activeCategory = category; };
    vm.categoryIcon = function (category) {
      return ({Technical:"⌘",Cultural:"♫",Sports:"⚽",Hackathon:"⌁"})[category] || "✦";
    };
    vm.prettyDate = function (date) {
      if (!date) return "";
      return new Date(date + "T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    };
    vm.prettyTime = function (time) {
      if (!time) return "";
      var parts = time.split(":");
      var d = new Date(); d.setHours(Number(parts[0]),Number(parts[1] || 0));
      return d.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});
    };
    vm.seatPercent = function (event) {
      return event.max_seats ? Math.max(0,Math.min(100,(event.remaining_seats/event.max_seats)*100)) : 0;
    };
    vm.goHome = function () { vm.activeCategory = "All"; vm.searchText = ""; };
    vm.openAuth = function (mode) {
      vm.authMode = mode || "login"; vm.authMessage = ""; vm.authOpen = true;
    };
    vm.closeAuth = function () { vm.authOpen = false; vm.authMessage = ""; };
    vm.toggleAuthMode = function () {
      vm.authMode = vm.authMode === "signup" ? "login" : "signup";
      vm.authMessage = "";
    };
    vm.submitAuth = function () {
      if (!vm.client) {
        vm.authMessage = "Connect Supabase first. See the setup guide in README.md.";
        return;
      }
      vm.busy = true; vm.authMessage = "";
      var action = vm.authMode === "signup"
        ? vm.client.auth.signUp({email:vm.auth.email,password:vm.auth.password})
        : vm.client.auth.signInWithPassword({email:vm.auth.email,password:vm.auth.password});
      action.then(function (result) {
        enterAngular(function () {
          vm.busy = false;
          if (result.error) {
            vm.authMessage = handleError(result.error,"Authentication failed.");
          } else if (vm.authMode === "signup" && !result.data.session) {
            vm.authMessage = "Account created. Check your email to confirm it, then sign in.";
          } else {
            vm.user = result.data.user;
            vm.closeAuth();
            showToast(vm.authMode === "signup" ? "Account created!" : "Signed in successfully!");
            loadRegistrations();
          }
        });
      });
    };
    vm.signOut = function () {
      if (!vm.client) { vm.user = null; return; }
      vm.client.auth.signOut().then(function () {
        enterAngular(function () {
          vm.user = null; vm.myRegistrations = [];
          showToast("You have signed out.");
        });
      });
    };
    vm.openRegister = function (event) {
      vm.selectedEvent = event;
      vm.registerMessage = "";
      vm.rsvp = {name:"",usn:"",email:vm.user ? vm.user.email : "",phone:""};
      if (!vm.user) {
        vm.openAuth("login");
        vm.authMessage = "Please sign in or create an account before registering.";
        return;
      }
      vm.registerOpen = true;
    };
    vm.closeRegister = function () { vm.registerOpen = false; vm.registerMessage = ""; };
    vm.registerForEvent = function () {
      if (!vm.client) {
        vm.registerMessage = "Demo mode only. Connect Supabase to save registrations.";
        return;
      }
      if (!vm.user) { vm.registerMessage = "Please sign in first."; return; }
      vm.busy = true; vm.registerMessage = "";
      vm.client.rpc("register_for_event", {
        p_event_id: vm.selectedEvent.id,
        p_student_name: vm.rsvp.name.trim(),
        p_student_usn: vm.rsvp.usn.trim().toUpperCase(),
        p_student_phone: vm.rsvp.phone.trim()
      }).then(function (result) {
        enterAngular(function () {
          vm.busy = false;
          if (result.error) {
            vm.registerMessage = handleError(result.error,"Registration failed.");
          } else {
            vm.closeRegister();
            showToast("You're registered! Your seat is confirmed.");
            refreshEvents(); loadRegistrations();
          }
        });
      });
    };
    vm.showMyRegistrations = function () {
      vm.drawerOpen = true; vm.drawerMessage = ""; loadRegistrations();
    };
    vm.closeDrawer = function () { vm.drawerOpen = false; };
    vm.cancelRegistration = function (registration) {
      if (!window.confirm("Cancel your registration for " + registration.event.title + "?")) return;
      vm.busy = true; vm.drawerMessage = "";
      vm.client.rpc("cancel_registration",{p_registration_id:registration.id})
        .then(function (result) {
          enterAngular(function () {
            vm.busy = false;
            if (result.error) {
              vm.drawerMessage = handleError(result.error,"Cancellation failed.");
            } else {
              showToast("Registration cancelled. Your seat is available again.");
              loadRegistrations(); refreshEvents();
            }
          });
        });
    };

    if (vm.client) {
      vm.client.auth.getSession().then(function (result) {
        enterAngular(function () {
          vm.user = result.data.session ? result.data.session.user : null;
          if (vm.user) loadRegistrations();
        });
      });
      vm.client.auth.onAuthStateChange(function (_event, session) {
        enterAngular(function () {
          vm.user = session ? session.user : null;
          if (!vm.user) vm.myRegistrations = [];
        });
      });
    }
    refreshEvents();
  }]);
})();