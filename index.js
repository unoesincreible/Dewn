let cs = Number(localStorage.getItem("cs")) || 0;
let currentSong = songs[cs];
let lastIndex = -1;


function formatTime(sec) {
    if (!isFinite(sec) || isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}


// LOAD SONG

function lss(){

    const song = songs[cs];

    currentSong = song;
    localStorage.setItem("cs", cs);

    const album = albums.find(a => a.key === song.albumkey);

    title.textContent = song.title;
    artist.textContent = song.artist + " — " + song.album; 
    cover.src = album.cover;
    au.src = song.music;

    b1.style.background = album.colors.b5;
    b3.style.background = album.colors.b3;
    b4.style.background = album.colors.b2;
    b5.style.background = album.colors.b2;
    b2.style.background = album.colors.b2;
    b6.style.background = album.colors.b4;
    body.style.backgroundColor = album.colors.b1;


    if (song.ex){

        ex.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" fill-rule="evenodd" d="M0 5a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5Zm8.2 1.8h7.3v1.8h-5.2v2.5h4.8v1.7h-4.8v2.6h5.3v1.8H8.2V6.8Z"/>
        </svg>`;

    } else {

        ex.innerHTML = "";

    }


    pro.value = 0;
    pro.style.setProperty("--progress", "0%");

    updateMediaSession(song);
}


lss();

au.addEventListener("timeupdate", () => {
    localStorage.setItem("time", au.currentTime);
});



// FAVORITE

favbtnn.addEventListener("click", () => {

    favbtnn.classList.toggle("active");

});


// PLAY / PAUSE

function iconwhenplay(){
    ply.innerHTML = `
    <svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.293 22.772c.955 0 1.436-.481 1.436-1.436V6.677c0-.98-.481-1.427-1.436-1.427h-2.457c-.954 0-1.436.473-1.436 1.427v14.66c-.008.954.473 1.435 1.436 1.435h2.457zm7.87 0c.954 0 1.427-.481 1.427-1.436V6.677c0-.98-.473-1.427-1.428-1.427h-2.465c-.955 0-1.428.473-1.428 1.427v14.66c0 .954.473 1.435 1.428 1.435h2.465z" fill="#000" fill-rule="nonzero"></path>
    </svg>
    `;
}
function iconwhenpause(){
    ply.innerHTML = `
    <svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.345 23.287c.415 0 .763-.15 1.22-.407l12.742-7.404c.838-.481 1.178-.855 1.178-1.46 0-.599-.34-.972-1.178-1.462L11.565 5.158c-.457-.265-.805-.407-1.22-.407-.789 0-1.345.606-1.345 1.57V21.71c0 .971.556 1.577 1.345 1.577z" fill-rule="nonzero"></path>
    </svg>
    `;
}

au.addEventListener("play", () => {
    iconwhenplay();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

au.addEventListener("pause", () => {
    iconwhenpause();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

ply.addEventListener("click", async () => {

    if (au.paused) {

        try {
            await au.play();
        } catch (error) {
            console.error("PLAY ERROR:", error);
        }

    } else {

        au.pause();

    }

});


// NEXT SONG WHEN ENDED

au.addEventListener("ended", () => {

    cs++;

    if (cs >= songs.length) {
        cs = 0;
    }

    lss();
    au.play();

});

// PREVV SONG 
prevbtn.addEventListener("click", () => {
    cs--;

    if (cs < 0){
        cs = songs.length - 1;
    }

    lss();
    au.play()
    
})


// NEXTT SONG 
nextbtn.addEventListener("click", () => {
    cs++;

    if (cs >= songs.length){
        cs = 0;
    }

    lss();
    iconwhenplay();
    au.play()
})


// AUDIO METADATA

au.addEventListener("loadedmetadata", () => {

    if (!isFinite(au.duration) || isNaN(au.duration)) return;

    minuteleft.textContent =
        "-" + formatTime(au.duration - au.currentTime);

    const song = currentSong;

    getLyrics(song, au.duration).then(lyricsData => {

        if (currentSong !== song) return;

        currentSong.lyrics = lyricsData;

        loadlirikk(lyricsData);

        lastIndex = -1;

    });
    

});



// AUDIO TIME UPDATE

au.addEventListener("timeupdate", () => {

    if (!isFinite(au.duration) || isNaN(au.duration)) return;


    // PROGRESS BAR

    const persen =
        (au.currentTime / au.duration) * 100;

    pro.value = persen;

    pro.style.setProperty(
        "--progress",
        `${persen}%`
    );


    // TIME

    minuteplayed.textContent =
        formatTime(au.currentTime);

    minuteleft.textContent =
        "-" + formatTime(au.duration - au.currentTime);



    // LYRICS SYNC

    if (!currentSong.lyrics) return;


    let index = -1;


    currentSong.lyrics.forEach((line, i) => {

        if (
            au.currentTime >=
            line.time + (currentSong.lyricOffset || 0)
        ) {
            index = i;
        }

    });


    if (index === lastIndex) return;


    lastIndex = index;


    const lyricLines = document.querySelectorAll("#lyrics p");

    lyricLines.forEach((p, i) => {

    p.classList.toggle(
        "active",
        i === index
    );

});

let lyricScrollAnimation;

function smoothLyricScroll(target, duration = 500) {
    cancelAnimationFrame(lyricScrollAnimation);

    const start = lyrics.scrollTop;
    const distance = target - start;
    const startTime = performance.now();

    function cubicBezier(t, p1, p2) {
        return (
            3 * (1 - t) ** 2 * t * p1 +
            3 * (1 - t) * t ** 2 * p2 +
            t ** 3
        );
    }

    function getBezierProgress(x) {
        let t = x;

        for (let i = 0; i < 8; i++) {
            const error = cubicBezier(t, 0.6, 0.4) - x;

            const derivative =
                3 * (1 - t) ** 2 * 0.6 +
                6 * (1 - t) * t * (0.4 - 0.6) +
                3 * t ** 2 * (1 - 0.4);

            if (Math.abs(error) < 0.0001) break;
            if (Math.abs(derivative) < 0.0001) break;

            t = Math.max(0, Math.min(1, t - error / derivative));
        }

        return cubicBezier(t, 0, 1);
    }

    function animate(now) {
        const progress = Math.min(
            (now - startTime) / duration,
            1
        );

        const eased = getBezierProgress(progress);

        lyrics.scrollTop = start + distance * eased;

        if (progress < 1) {
            lyricScrollAnimation =
                requestAnimationFrame(animate);
        } else {
            lyricScrollAnimation = null;
        }
    }

    lyricScrollAnimation = requestAnimationFrame(animate);
}

if (lyricLines[index]) {

    const activeLyric = lyricLines[index];

    const scrollPosition =
        activeLyric.offsetTop -
        (lyrics.clientHeight / 2) +
        (activeLyric.offsetHeight / 2);

    smoothLyricScroll(scrollPosition, 500);

}

});



// PROGRESS BAR

pro.addEventListener("input", () => {

    if (!isFinite(au.duration) || isNaN(au.duration)) return;


    au.currentTime =
        (pro.value / 100) * au.duration;


    minuteplayed.textContent =
        formatTime(au.currentTime);

    minuteleft.textContent =
        "-" + formatTime(au.duration - au.currentTime);

});



// VOLUME

volume.addEventListener("input", () => {

    au.volume = volume.value / 100;

    volume.style.setProperty("--volumee", `${volume.value}%`);
    volume2.value = volume.value;
    volume2.style.setProperty("--volumee", `${volume.value}%`);

    speakkker();

});
volume2.addEventListener("input", () => {

    au.volume = volume2.value / 100;

    volume.value = volume2.value;
    volume.style.setProperty("--volumee", `${volume2.value}%`);

    volume2.style.setProperty(
        "--volumee",
        `${volume2.value}%`
    );

    speakkker();

});



// SPEAKER ICON

function speakkker(){

    let svg;

    if (volume.value > 66){
        svg = `<svg viewBox="0 0 64 64">
            <path transform="translate(2,11.149)" d="m23.477 39.911c1.4129 0 2.431-1.0389 2.431-2.431v-33.141c0-1.3921-1.0181-2.5349-2.4726-2.5349-1.0181 0-1.7038.43634-2.805 1.4752l-9.2046 8.6644c-.14545.12464-.31166.18698-.51945.18698h-6.2126c-2.9297 0-4.5088 1.5999-4.5088 4.7374v8.0411c0 3.1167 1.5791 4.7166 4.5088 4.7166h6.2126c.20779 0 .374.06234.51945.18698l9.2046 8.7475c.99732.93501 1.8285 1.3506 2.8466 1.3506z M34.864 29.959c.70647.49868 1.7246.35323 2.3271-.47787 1.6205-2.1817 2.5971-5.3815 2.5971-8.6436 0-3.262-.9766-6.441-2.5971-8.6436-.60255-.83111-1.5999-.97655-2.3271-.49868-.89345.62336-1.0181 1.683-.35319 2.5765 1.2051 1.6207 1.9323 4.0932 1.9323 6.5658 0 2.4726-.76881 4.9451-1.9531 6.5866-.62332.89345-.51945 1.9116.374 2.5349z M43.154 35.569c.81021.54023 1.8077.33245 2.3894-.49867 2.7426-3.8231 4.3426-8.9137 4.3426-14.233 0-5.3399-1.5583-10.451-4.3426-14.254-.60255-.81034-1.579-1.0181-2.3894-.47787-.78979.54021-.91447 1.558-.29106 2.4518 2.2647 3.3245 3.6779 7.6878 3.6779 12.28s-1.3923 8.9969-3.6779 12.28c-.60255.89345-.49872 1.9116.29106 2.4518z M51.527 41.241c.76894.51945 1.7872.31166 2.3898-.54021 3.8438-5.423 6.0255-12.446 6.0255-19.864s-2.2443-14.42-6.0255-19.864c-.60255-.87268-1.6209-1.0805-2.3898-.54021-.78936.56098-.91404 1.579-.31149 2.4518 3.3451 4.9244 5.423 11.241 5.423 17.952s-1.9945 13.132-5.423 17.952c-.60255.87268-.47787 1.8908.31149 2.4518z"/>
        </svg>`;
    } else if (volume.value > 33){
        svg = `<svg viewBox="0 0 64 64">
            <path transform="translate(2,11.149)" d="m23.477 39.911c1.4129 0 2.431-1.0389 2.431-2.431v-33.141c0-1.3921-1.0181-2.5349-2.4726-2.5349-1.0181 0-1.7038.43634-2.805 1.4752l-9.2046 8.6644c-.14545.12464-.31166.18698-.51945.18698h-6.2126c-2.9297 0-4.5088 1.5999-4.5088 4.7374v8.0411c0 3.1167 1.5791 4.7166 4.5088 4.7166h6.2126c.20779 0 .374.06234.51945.18698l9.2046 8.7475c.99732.93501 1.8285 1.3506 2.8466 1.3506z M34.864 29.959c.70647.49868 1.7246.35323 2.3271-.47787 1.6205-2.1817 2.5971-5.3815 2.5971-8.6436 0-3.262-.9766-6.441-2.5971-8.6436-.60255-.83111-1.5999-.97655-2.3271-.49868-.89345.62336-1.0181 1.683-.35319 2.5765 1.2051 1.6207 1.9323 4.0932 1.9323 6.5658 0 2.4726-.76881 4.9451-1.9531 6.5866-.62332.89345-.51945 1.9116.374 2.5349z"/>
        </svg>`;
    } else if (volume.value > 1){
        svg = `<svg viewBox="0 0 64 64">
            <path transform="translate(2,11.149)" d="m23.477 39.911c1.4129 0 2.431-1.0389 2.431-2.431v-33.141c0-1.3921-1.0181-2.5349-2.4726-2.5349-1.0181 0-1.7038.43634-2.805 1.4752l-9.2046 8.6644c-.14545.12464-.31166.18698-.51945.18698h-6.2126c-2.9297 0-4.5088 1.5999-4.5088 4.7374v8.0411c0 3.1167 1.5799 4.7166 4.5088 4.7166h6.2126c.20779 0 .374.06234.51945.18698l9.2046 8.7475c.99732.93501 1.8285 1.3506 2.8466 1.3506z M34.864 29.959c.70647.49868 1.7246.35323 2.3271-.47787 1.6205-2.1817 2.5971-5.3815 2.5971-8.6436 0-3.262-.9766-6.441-2.5971-8.6436-.60255-.83111-1.5999-.97655-2.3271-.49868-.89345.62336-1.0181 1.683-.35319 2.5765 1.2051 1.6207 1.9323 4.0932 1.9323 6.5658 0 2.4726-.76881 4.9451-1.9531 6.5866-.62332.89345-.51945 1.9116.374 2.5349z"/>
        </svg>`;
    } else {
        svg = `<svg viewBox="0 0 64 64">
            <path transform="translate(2,11.149)" d="m23.477 39.911c1.4129 0 2.431-1.0389 2.431-2.431v-33.141c0-1.3921-1.0181-2.5349-2.4726-2.5349-1.0181 0-1.7038.43634-2.805 1.4752l-9.2046 8.6644c-.14545.12464-.31166.18698-.51945.18698h-6.2126c-2.9297 0-4.5088 1.5999-4.5088 4.7374v8.0411c0 3.1167 1.5791 4.7166 4.5088 4.7166h6.2126c.20779 0 .374.06234.51945.18698l9.2046 8.7475c.99732.93501 1.8285 1.3506 2.8466 1.3506z"/>
        </svg>`;
    }

    vicon.innerHTML = svg;
    if (vicon2) vicon2.innerHTML = svg;

}

speakkker();


function loadlirikk(lyricsData){

    lyrics.innerHTML = "";

    if (!lyricsData || !lyricsData.length) return;

    lyricsData.forEach((line, index) => {

        const p = document.createElement("p");

        p.textContent = line.text;
        p.dataset.time = line.time;
        p.dataset.index = index;

        p.addEventListener("click", () => {
            au.currentTime = line.time + (currentSong.lyricOffset || 0);
        });

        lyrics.appendChild(p);

    });

}

// SHORTCUTTT

document.addEventListener("keydown", (e) => {

    // PLAY
    if (e.code === "Space") {
        e.preventDefault();
        ply.click();
    }

    // NEXT
    if (e.ctrlKey && e.code === "ArrowRight") {
        e.preventDefault();
        nextbtn.click();
    }

    // PREV
    if (e.ctrlKey && e.code === "ArrowLeft") {
        e.preventDefault();
        prevbtn.click();
    }

    // SHOWLYRICS
    if (e.ctrlKey && e.code === "KeyP") {
        e.preventDefault();
        lyricsbtnt.click();
    }

});

// flexcontent
function flexxx(){
    if (rsect.style.display === "none"){
        lsectt.classList.add("hide");
    } else{
    }
}

// Lyrics TOGGLEE

lyricsbtnt.addEventListener("click", () => {
    if (rsect.classList.contains("hide")) {
        rsect.classList.remove("hide");
        rsect.classList.add("view");
        lsectt.classList.remove("hide");
        lyricsbtnt.querySelector("svg").classList.remove("hide");
        lyricsbtnt.querySelector("svg").maskImage(album.colors.b1);
    } else {
        rsect.classList.add("hide");
        rsect.classList.remove("view");
        lsectt.classList.add("hide");
        lyricsbtnt.querySelector("svg").classList.add("hide");
    }
});
flexxx();

// media metadata for navigator bar
function updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    const album = albums.find(a => a.key === song.albumkey);
    const coverSrc = album ? album.cover : '';

    navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album,
        artwork: coverSrc ? [
            { src: coverSrc, sizes: '512x512', type: 'image/jpeg' }
        ] : []
    });

    navigator.mediaSession.setActionHandler('play', () => au.play());
    navigator.mediaSession.setActionHandler('pause', () => au.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        cs--;
        if (cs < 0) cs = songs.length - 1;
        lss(); au.play();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        cs++;
        if (cs >= songs.length) cs = 0;
        lss(); au.play();
    });
}
