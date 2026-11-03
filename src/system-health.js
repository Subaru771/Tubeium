'use strict';
const os=require('node:os');
function basicHealth({version,settingsCount,jobs,libraryCount,downloader,ffmpeg,updateConfigured,accountEvidence}){
 const values={application:'Tubeium',version:String(version),platform:process.platform,architecture:process.arch,osRelease:os.release(),electron:process.versions.electron||'not running in Electron',node:process.versions.node,settingsCount,downloadTasks:jobs.length,completedDownloads:jobs.filter(j=>j.status==='completed').length,failedDownloads:jobs.filter(j=>j.status==='error').length,localLibraryEntries:libraryCount,downloader:String(downloader),ffmpeg:String(ffmpeg),updateConfigured:!!updateConfigured,accountEvidence:accountEvidence||'not checked'};
 return Object.freeze(values);
}
module.exports={basicHealth};
